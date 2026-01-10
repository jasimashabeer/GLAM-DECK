const Order    = require('../../models/orderSchema');
const Product  = require('../../models/productSchema');
const Address  = require('../../models/addressSchema');
const { creditWallet } = require('../user/walletController');
const User=require('../../models/userSchema')
const Razorpay = require('razorpay');

const crypto = require('crypto');   //  built-in module

const mongoose = require('mongoose');

// Initialize Razorpay
const rzp = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Make sure this is NOT repeated anywhere


const incStock = async (productId, qty) => {
  await Product.findByIdAndUpdate(
    productId,
    { $inc: { stock: qty } }, 
    { new: true }
  );
};





/* refund helper  (price × qty − discounts if any) */
const getItemRefund = (item) => {
  const price     = Number(item.price)     || 0;
  const qty       = Number(item.quantity)  || 1;
  const discount  = Number(item.discount)  || 0;   // % discount per item
  const netPrice  = price * (1 - discount / 100);
  return netPrice * qty;
};

/* ───────── list, detail, invoice ───────── */

const loadOrders = async (req, res) => {
  try {
    const userId = req.session.user; // Session now stores just the ID
    const q      = req.query.search || '';
    const page   = +req.query.page || 1;
    const limit  = 3;
    const skip   = (page - 1) * limit;

    const filter = { user: userId };
    if (q) filter.orderId = { $regex: q, $options: 'i' };

    const total  = await Order.countDocuments(filter);
    const orders = await Order.find(filter).sort({ createdOn: -1 })
                     .skip(skip).limit(limit).populate('orderedItems.product');

    res.render('orders', {
      orders,
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      search:      q
    });
  } catch (err) {
    console.error('loadOrders', err);
    res.status(500).send('Internal Server Error');
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user; // Session now stores just the ID
    const order  = await Order.findOne({ _id: req.params.id, user: userId })
                     .populate('orderedItems.product');
    if (!order) return res.status(404).render('404', { message: 'Order not found' });

    const addressDoc = await Address.findOne({ userId }).lean();
    const selectedAddress = addressDoc?.address.find(
      a => String(a._id) === String(order.address)
    );


     
    res.render('order-details', {
    
      order,
      
      selectedAddress,
      user: res.locals.user, // Use res.locals.user instead of req.session.user
      shippingCharge: 50,
    
    });
  } catch {
    res.status(500).send('Internal Server Error');
  }
};

const getInvoice = async (req, res) => {
  try {
    const userId = req.session.user; // Session now stores just the ID
    const order  = await Order.findOne({ _id: req.params.id, user: userId })
                     .populate('orderedItems.product');
    if (!order) return res.status(404).render('404', { message: 'Order not found' });

    const addressDoc = await Address.findOne({ userId }).lean();
    const selectedAddress = addressDoc?.address.find(
      a => String(a._id) === String(order.address)
    );

    res.render('invoice', {
      order,
      user: req.session.user,
      selectedAddress,
      shippingCharge: 50
    });
  } catch (err) {
    console.error('getInvoice', err);
    res.status(500).send('Internal Server Error');
  }
};

/* ───────── WHOLE‑ORDER cancel ───────── */

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '', description = '' } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, msg: 'Order not found' });
    if (order.status === 'Cancelled')
      return res.status(400).json({ ok: false, msg: 'Already cancelled' });

    let refundTotal = 0;

    for (const it of order.orderedItems) {
      if (!['Cancelled', 'returned'].includes(it.status)) {
        await incStock(it.product, it.quantity);
        refundTotal =order.finalAmount;

        it.status            = 'Cancelled';
        it.cancelReason      = reason;
        it.cancelDescription = description;
      }
    }

    order.status            = 'Cancelled';
    order.cancelReason      = reason;
    order.cancelDescription = description;
    await order.save();
if(order.paymentMethod!=='Cash On Delivery'){
    await creditWallet(
      order.user,
      refundTotal,
      `Refund - cancelled order ${order.orderId || order._id}`,
      order.orderId || order._id
    );
  } 

    res.json({ ok: true });

  } catch (err) {
    console.error('cancelOrder', err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
};

/* ───────── ITEM‑LEVEL cancel ───────── */

const cancelProduct = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason = '', description = '' } = req.body;

    if (!reason) return res.status(400).json({ ok: false, msg: 'Reason required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ ok: false, msg: 'Order not found' });

    const item = order.orderedItems.id(itemId);
    if (!item)   return res.status(404).json({ ok: false, msg: 'Item not found' });
    if (item.status === 'Cancelled') return res.json({ ok: true }); // already done

    await incStock(item.product, item.quantity);

    item.status            = 'Cancelled';
    item.cancelReason      = reason;
    item.cancelDescription = description;

    if (order.orderedItems.every(i => i.status === 'Cancelled'))
      order.status = 'Cancelled';

    await order.save();
const refundAmount = getItemRefund(item);
console.log('💰 Refunding to wallet:', refundAmount); // add this
if(order.paymentMethod!=='Cash On Delivery'){
await creditWallet(
  order.user,
  refundAmount,
  `Refund - cancelled item ${itemId}`,
  order.orderId || order._id
);
}

    res.json({ ok: true });
  } catch (err) {
    console.error('cancelProduct', err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
};


const returnProduct = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, description } = req.body;
    const imagePaths = (req.files || []).map(f => f.path);

    if (!reason || !description)
      return res.status(400).json({ ok:false, msg:'Reason & description required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ ok:false, msg:'Order not found' });

    const item = order.orderedItems.id(itemId);
    if (!item)  return res.status(404).json({ ok:false, msg:'Item not found' });
    if (['Return Request','returned'].includes(item.status))
      return res.json({ ok:true });

    item.status = 'Return Request';
    item.returnReason = reason;
    item.returnDescription = description;
    item.returnImages = imagePaths;

    if (order.orderedItems.every(i => ['Return Request','returned'].includes(i.status)))
      order.status = 'Return Request';

    await order.save();
    res.json({ ok:true });
  } catch (err) {
    console.error('returnProduct', err);
    res.status(500).json({ ok:false, msg:'Server error' });
  }
};


const getretryPayment = async (req, res) => {
  const { orderId } = req.params;
  const userSession = req.session.user;

  //  First, check if orderId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(404).send('Not Found'); 
  }

  //  Only query database if orderId is valid
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).send('Order not found');

  // Load full user with wallet to avoid undefined in view
  const user = userSession ? await User.findById(userSession).lean() : null;

  res.render('retryPayment', { user, order });
};



// POST /return-order/:id
const returnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const imagePaths = (req.files || []).map(f => f.path);

    if (!reason || !description)
      return res.status(400).json({ ok: false, msg: 'Reason & description required' });

    const order = await Order.findById(id);
    if (!order || order.status !== 'Delivered')
      return res.status(400).json({ ok: false, msg: 'Invalid return request' });

    /* 1️⃣  flag every item as “Return Request” (unless already returned) */
    for (const it of order.orderedItems) {
      if (!['Return Request', 'returned'].includes(it.status)) {
        it.status           = 'Return Request';
        it.returnReason     = reason;
        it.returnDescription = description;
        it.returnImages      = imagePaths;
      }
    }

    /* 2️⃣  update the order */
    order.status           = 'Return Request';
    order.returnReason     = reason;
    order.returnDescription = description;
    order.returnImages      = imagePaths;

    await order.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('returnOrder', err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
};




const retryCOD = async (req, res) => {
  try {
    const { orderId } = req.params;   //  FIXED
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.finalAmount > 1000) {
      return res.status(400).json({ message: 'COD is only available for orders up to ₹1000.' });
    }

    order.paymentMethod = 'Cash On Delivery';
    order.status = 'Confirmed';
    await order.save();

return res.json({ status: true, message: 'COD selected successfully', orderId: order._id });

  } catch (err) {
    console.error('Retry COD Error:', err);
    res.status(500).json({ message: 'Server error during COD retry' });
  }
};

/* ========== WALLET RETRY ========== */
const retryWallet = async (req, res) => {
  try {
   const { orderId } = req.params;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const user = await User.findById(userId);

    if (user.wallet.balance < order.finalAmount) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    // Deduct wallet balance
    user.wallet.balance -= order.finalAmount;
    user.wallet.transactions.push({
      amount: order.finalAmount,
      type: 'debit',
      description: 'Retry order payment using wallet',
      createdAt: new Date()
    });
    await user.save();

    // Update order status
    order.paymentMethod = 'Wallet';
 
    order.status = 'Confirmed';
    await order.save();

 return res.json({ status: true, message: 'Wallet payment successful', orderId: order._id });

  } catch (err) {
    console.error('Retry Wallet Error:', err);
    res.status(500).json({ message: 'Server error during wallet retry' });
  }
};



const retryRazorpay = async (req, res) => {
  try {
    const { orderId } = req.body;   // use the correct field

   const order = await Order.findById(orderId);   //  now it will work

    if (!order) return res.status(404).json({ message: 'Order not found' });

    //  Create new Razorpay order with correct amount
    const rzOrder = await rzp.orders.create({
      amount: order.finalAmount * 100,   //  Razorpay expects paisa, so multiply by 100
      currency: 'INR',
      receipt: `retry_${order._id}`
    });

    //  Update DB
    order.razorpayOrderId = rzOrder.id;
    order.paymentMethod = 'Razorpay';
    order.status = 'Pending';
    await order.save();

    return res.json({ id: rzOrder.id, amount: order.finalAmount * 100, orderId: order._id });
  } catch (err) {
    console.error('Retry Razorpay Error:', err);
    res.status(500).json({ message: 'Server error during Razorpay retry' });
  }
};


/* ========== VERIFY RAZORPAY PAYMENT ========== */
const verifyRetryPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

const order = await Order.findById(orderId);
if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
const generatedSignature = hmac.digest('hex');

if (generatedSignature !== razorpay_signature) {
   return res.status(400).json({ success: false, message: 'Payment signature mismatch' });
}


    order.status = 'Confirmed';
    await order.save();


return res.json({ 
  success: true, 
  message: 'Payment verified and order confirmed',
  orderId: order._id 
});





  } catch (err) {
    console.log('Verify Retry Payment Error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying Razorpay payment' });
  }
};




module.exports = {
  loadOrders,
  viewOrderDetails,
  getInvoice,
  cancelOrder,
  cancelProduct,
  returnOrder,
  returnProduct,
  getretryPayment,
  verifyRetryPayment,
  retryCOD,
  retryWallet,
  retryRazorpay
};
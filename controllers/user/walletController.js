const User = require('../../models/userSchema');

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


const loadWalletPage = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user;
    const userData = await User.findById(userId).lean();

    if (!userData) return res.redirect('/login');

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const startIndex = (page - 1) * limit;

    // Clone + reverse before slicing
    const allTransactions = userData.wallet?.transactions || [];
    const sortedTransactions = [...allTransactions].reverse(); // latest first

    const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(sortedTransactions.length / limit);

    res.render('wallet', {
      user: userData,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
       razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Error loading wallet:", error);
    res.redirect('/profile');
  }
};


const createOrder=async(req,res)=>{
  try {
    const {amount}=req.body;
    if(!amount || amount<=0){
      return res.status(400).json({success:false,error:'Server Error'})
    }
      const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };
        const order = await razorpay.orders.create(options);
    res.status(200).json(order);

  } catch (error) {
    console.log('error in create order',error);
    res.status(500).json({ success:false,error: "Server error" });
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const userId = req.session.user;

    // Generate signature and validate
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Update wallet
    user.wallet.balance += parseInt(amount);
    user.wallet.transactions.push({
      amount,
      type: "credit",
      description: "Wallet Top-Up",
      orderId: razorpay_order_id, // optional, useful for records
      date: new Date()
    });

    await user.save();

    res.status(200).json({ success: true, message: "Payment successful", wallet: user.wallet });

  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const withdrawMoney = async (req, res) => {
  try {
    const userId = req.session.user;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Find user with embedded wallet
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (user.wallet.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: `You only have ₹${user.wallet.balance.toFixed(2)} in your wallet!` 
      });
    }

    // Deduct balance
    user.wallet.balance -= parseInt(amount);

    // Add transaction
    user.wallet.transactions.push({
      amount,
      type: "debit",
      description: "Withdrawal"
    });

    await user.save();

    res.status(200).json({ success: true, message: "Amount will be credited to your account" });

  } catch (error) {
    console.error('Error in withdrawing money:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const creditWallet = async (userId, amount, description, orderId = null) => {
  if (amount <= 0) return;                             // safety check
  const user = await User.findById(userId);
  if (!user) return;

  // initialise wallet object if it doesn’t exist yet
  if (!user.wallet || typeof user.wallet.balance !== 'number')
    user.wallet = { balance: 0, transactions: [] };

  user.wallet.balance += amount;
  user.wallet.transactions.push({
    type: 'credit',
    amount,
    description,
    orderId,
    date: new Date()
  });

  await user.save({ validateBeforeSave: false });

  
};



module.exports = {
  loadWalletPage,
  createOrder,
  verifyPayment,
  withdrawMoney,

  creditWallet,

};
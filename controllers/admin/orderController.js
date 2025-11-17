const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const listOrders = async (req, res) => {
  try {
    const {
      page = 1,
      search = "",
      status = "all",
      sortField = "createdOn",
      sortOrder = "desc",
    } = req.query;

    const limit = 4; // 8 rows per page
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) filter.orderId = { $regex: search, $options: "i" };
    if (status && status !== "all") filter.status = status;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("user", "name email") // only need name/email
      .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.render("orderPage", {
      orders,
      searchQuery: search,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      status: req.query.status || "all",
      sortField: req.query.sortField || "createdOn",
      sortOrder: req.query.sortOrder || "desc",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res
        .status(400)
        .json({ ok: false, msg: "Order ID and status are required" });
    }

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Request",
      "returned",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ ok: false, msg: "Invalid status value" });
    }

    const order = await Order.findById(id).populate("orderedItems.product");

    if (!order) {
      return res.status(404).json({ ok: false, msg: "Order not found" });
    }

    //  If admin cancels the order, increase stock
    if (status === "Cancelled" && order.status !== "Cancelled") {
      for (const item of order.orderedItems) {
        const product = item.product;
        product.quantity += item.quantity;
        await product.save();
      }
    }

    order.status = status;
    await order.save();

    res
      .status(200)
      .json({ ok: true, msg: "Status updated successfully", order });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ ok: false, msg: "Internal server error" });
  }
};

const verifyReturnRequest = async (req, res) => {
  try {
    const orderId = req.params.id;

 
    const order = await Order.findById(orderId);
    if (!order || order.status !== "Return Request") {
      return res
        .status(400)
        .json({ ok: false, msg: "Return verification not allowed" });
    }

    const userId = order.user._id || order.user;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ ok: false, msg: "User not found" });


    const refundAmount = order.finalAmount;
    if (!user.wallet) {
      user.wallet = { balance: 0, transactions: [] };
    }

    user.wallet.balance += refundAmount;
    user.wallet.transactions.push({
      type: "credit",
      amount: refundAmount,
      description: `Refund - cancelled order ${order._id}`,
      orderId: order._id,
    });
    await user.save();

    order.orderedItems.forEach((item) => {
      if (item.status === "Return Request") item.status = "returned";
    });
    order.status = "returned";
    await order.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Verify-return error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

const viewAdminOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate(
      "orderedItems.product user",
    );

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const userId = order.user._id; 

    const addressDoc = await Address.findOne({ userId }).lean();
    const selectedAddress = addressDoc?.address.find(
      (addr) => String(addr._id) === String(order.address),
    );

    res.render("order-details-admin", {
      order,
      user: order.user,
      address: selectedAddress, 
    });
  } catch (err) {
    console.error("Error loading order details:", err);
    res.status(500).send("Server error");
  }
};
const verifyProductReturn = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;

    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).send("Order not found");

    const user = order.user;
    if (!user) return res.status(404).send("User not found");

    const item = order.orderedItems.id(itemId);
    if (!item || item.status !== "Return Request") {
      return res.status(400).send("Invalid or already processed item");
    }

    // 1. Refund the item's price
    const refundAmount = item.price;
    if (!user.wallet) {
      user.wallet = { balance: 0, transactions: [] };
    }

    user.wallet.balance += refundAmount;
    user.wallet.transactions.push({
      type: "credit",
      amount: refundAmount,
      description: `Refund - returned product ${item.product}`,
      orderId: order._id,
    });
    await user.save();

    item.status = "returned";

    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: item.quantity },
    });

    const allReturned = order.orderedItems.every(
      (i) => i.status === "returned",
    );
    if (allReturned) order.status = "returned";

    await order.save();

    res.redirect(`/admin/viewDetails/${orderId}`);
  } catch (err) {
    console.error("verifyProductReturn error:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  listOrders,
  updateStatus,
  verifyReturnRequest,
  viewAdminOrderDetails,
  verifyProductReturn,
};
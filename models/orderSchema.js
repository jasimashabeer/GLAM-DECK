
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: uuidv4,
    unique: true
  },

  orderedItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true
      },

      //  NEW: Per-product status & return/cancel fields
      status: {
        type: String,
        enum: ['Ordered', 'Cancelled', 'Return Request', 'returned'],
        default: 'Ordered'
      },
      cancelReason: String,
      returnReason: String,
      returnDescription: String,
      returnImages: [String]
    }
  ],

  totalPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
    totalDiscount: { type: Number, default: 0 },
  finalAmount: {
    type: Number,
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },

  
  shippingCharge: {
  type: Number,
  default: 50
},

  inVoiceDate: {
    type: Date
  },

  //  Whole order status
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'returned'],
    default: 'Pending'
  },
paymentMethod: {
  type: String,
  required: true,
  enum: ['Cash On Delivery', 'Razorpay', 'Wallet']
},


  //  Whole-order return data (optional; kept if needed)
  returnReason: String,
  returnDescription: String,
  returnImages: [String],

  createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },

  couponStatus: {
    type: Boolean,
    default: false
  }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
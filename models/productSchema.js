const mongoose = require('mongoose');
const {Schema}=mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  regularPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,

  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  image: {
    type: [String],
    required: true
  },
  productOffer: {
    type: Number,
    default: 0
  },
  isListed: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out-of-stock'],
    default: 'active'
  }
}, { timestamps: true });

const Product = mongoose.model('Product',productSchema)

module.exports = Product;
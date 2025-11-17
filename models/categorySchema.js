const mongoose=require('mongoose')
const {Schema}=mongoose;


const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  categoryOffer: {
  type: Number,
  default: 0
},

  isListed: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});


const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
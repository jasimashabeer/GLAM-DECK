const mongoose = require("mongoose");
const Category = require("./categorySchema");
const {Schema} = mongoose;




const userSchema = new Schema({
   name : {
       type:String,
       required : true
   },
   email: {
       type : String,
       required:true,
       unique: true,
       sparse: true
   },
   phone : {
       type : String,
       required: false,
       unique: false,
       sparse:true,
       default:null
   },
   googleId: {
       type : String,
       unique:true,
       sparse: true
   },
   password : {
       type:String,
       required :false
   },
   isBlocked: {
       type : Boolean,
       default:false
   },
   isAdmin : {
       type: Boolean,
       default:false
   },
  image: { type: String, default: '' },


   cart: [{
       type : Schema.Types.ObjectId,
       ref :"Cart"
   }],


wallet: {
  balance: {
    type: Number,
    default: 0
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ['credit', 'debit']
      },
      amount: Number,
      description: String,
      orderId: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ]
},


wishlist:[{
    type:Schema.Types.ObjectId,
    ref:"Wishlist"
}],
orderHistory:[{
    type:Schema.Types.ObjectId,
    ref:"Order"
}],
createdOn : {
    type:Date,
    default:Date.now,
},referralCode: {
  type: String,
  default: null
}

,
referredBy: {
  type: String,
  default: null  
},
redeemed:{
    type:Boolean
},
redeemedUsers: [{
    type: Schema.Types.ObjectId,
    ref:"User"
}],
searchHistory: [{
    category: {
        type: Schema.Types.ObjectId,
        ref:"Category",
    },
    language : {
        type : String
    },
    searchOn : {
        type: Date,
        default: Date.now
    }
}]

},{
    timestamps:true
}
)




const User = mongoose.model("User",userSchema);


module.exports = User;
const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Cart = require('../../models/cartSchema');



const loadWishlist=async(req,res)=>{
    try {
        const userId=req.session.user;
        // console.log('Session:', req.session);

        const user=await User.findById(userId)
        const products=await Product.find({_id:{$in:user.wishlist}}).populate('category')
        res.render('wishlist',{
            user,
            wishlist:products,
        })
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
} 


const toggleWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user;

    if (!userId) {
      return res.status(200).json({
        status: false,
        message: 'You must be logged in to use wishlist.',
      });
    }

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId });

    const isInCart = cart?.items?.some(item => item.productId.toString() === productId);
    if (isInCart) {
      return res.status(200).json({
        status: false,
        message: 'Product already in cart',
      });
    }

    const index = user.wishlist.indexOf(productId);

    if (index > -1) {
      user.wishlist.splice(index, 1);
      await user.save();
      return res.status(200).json({
        status: true,
        action: 'removed',
        message: 'Product removed from wishlist',
        wishlistCount:user.wishlist.length

      });
    } else {
      user.wishlist.push(productId);
      await user.save();
      return res.status(200).json({
        status: true,
        action: 'added',
        message: 'Product added to wishlist',
        wishlistCount:user.wishlist.length
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Server error'
    });
  }
};


const removeProduct=async(req,res)=>{
    try {
        const productId=req.query.productId;
        const userId=req.session.user
        const user= await User.findById(userId)
        const index=user.wishlist.indexOf(productId)
        user.wishlist.splice(index,1)
        await user.save()
        return res.redirect('/wishlist')
    } catch (error) {
        console.log(error)
        return res.status(500).json({status:false,message:'Server error'})
    }
}
module.exports={
    loadWishlist,
    toggleWishlist,
    removeProduct,
}
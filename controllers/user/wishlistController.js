const Product=require('../../models/productSchema')
const Category= require("../../models/categorySchema")
const Cart=require('../../models/cartSchema')
const User=require('../../models/userSchema')
const Wishlist=require('../../models/wishlistSchema')
const mongoose=require('mongoose')



const addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const userId = req.session.user._id;
        const { productId } = req.body;
        console.log("productid",productId) //tes

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product || product.status !== "Listed")  {
            return res.status(404).json({ success: false, message: 'Product not found or not listed' });
        }

        // Check if already in wishlist
        const exists = await Wishlist.findOne({ userId, productId });
        if (exists) {
            return res.json({ success: false, message: 'Product already in wishlist' });
        }

        // Add to wishlist
        await Wishlist.create({ userId, productId });
        return res.json({ success: true, message: 'Product added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




const removeFromWishlist = async (req, res) => {
    try {
        const productId = req.params.id;  // Get the product ID from URL parameters
        const userId = req.session.user._id;  // Get the logged-in user's ID

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        // Find and delete the wishlist entry for this product and user
        const deleted = await Wishlist.findOneAndDelete({ userId, productId });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Product not in wishlist' });
        }

        // Send a response if the item was successfully removed
        return res.status(200).json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};







// const getWishlist = async (req, res) => {
//     try {
//         const userId = req.session.user?._id;

//         const wishlistItems = await Wishlist.find({ userId })
//             .populate({
//                 path: 'productId',
//                 match: { status: 'Listed'}, // Only show listed products
//             });

//         // Filter out null products (unlisted)
//         const validWishlist = wishlistItems
//             .filter(item => item.productId)
//             .map(item => item.productId); // Extract product details only

//         res.render('wishlist', {
//             wishlistItems: validWishlist
//         });
//     } catch (error) {
//         console.error("Error fetching wishlist:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };

// const getWishlist = async (req, res) => {
//     console.log("Session userId:", req.session.userId);

//     try {
//       const userId = req.session.userId;
  
     
  
//       const user = await User.findById(userId)
//         .populate('wishlist.productId')
//         .populate('cart.productId');
  
//       if (!user) {
//         return res.status(404).send("User not found");
//       }
  
//       const cartProductIds = user.cart.map(item => item.productId._id.toString());
  
//       const filteredWishlist = user.wishlist.filter(item => {
//         return !cartProductIds.includes(item.productId._id.toString());
//       });
  
//       res.render('wishlist', {
//         wishlist: filteredWishlist,
//       });
//     } catch (error) {
//       console.error("Error loading wishlist:", error);
//       res.status(500).send("Server error");
//     }
//   };
  
const getWishlist = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;

    if (!userId) {
      return res.status(401).send("Unauthorized: User not logged in");
    }

    // Step 1: Get wishlist items
    const wishlistItems = await Wishlist.find({ userId })
      .populate({
        path: 'productId',
        match: { status: 'Listed' } // Only show listed products
      });

    // Step 2: Get cart product IDs
    const cart = await Cart.findOne({ userId }).populate('products.productId');
    const cartProductIds = cart
      ? cart.products.map(item => item.productId?._id.toString())
      : [];

    // Step 3: Filter wishlist to remove items already in cart or null (unlisted)
    const filteredWishlist = wishlistItems
      .filter(item => item.productId && !cartProductIds.includes(item.productId._id.toString()))
      .map(item => item.productId); // Get only product details

    // Step 4: Render wishlist page
    res.render('wishlist', {
      wishlist: filteredWishlist
    });

  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.status(500).send("Server error");
  }
};




module.exports = {getWishlist ,removeFromWishlist,addToWishlist};





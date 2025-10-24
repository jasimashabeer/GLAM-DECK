const Product=require('../../models/productSchema')
const Category= require("../../models/categorySchema")
const Cart=require('../../models/cartSchema')
const Wishlist=require('../../models/wishlistSchema')
const mongoose=require('mongoose')

const getCart = async (req, res) => {
  try {
    const user = req.session.user;

    // Fetch cart items for the user and populate product details
    const cartItems = await Cart.find({ userId: user._id })
      .populate({
        path: 'products.productId',
        select: 'name image price', // Make sure to select the necessary fields
      });

    if (!cartItems || cartItems.length === 0) {
      return res.render('cart', {
        user,
        cartItems: [],
        subtotal: 0,
        message: 'Your cart is empty'
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    cartItems.forEach(item => {
      item.products.forEach(product => {
        if (product.productId) { // Ensure productId exists before accessing its properties
          subtotal += product.productId.price * product.quantity;
        }
      });
    });

    // Pass necessary data to cart.ejs
    res.render('cart', {
      user,
      cartItems,
      subtotal,
      message: ''
    });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.status(500).send('Internal Server Error');
  }
};




// const addToCart = async (req, res) => {
//   const { productId, quantity } = req.body;
//   const userId = req.session.user._id;

//   try {
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ error: 'Product not found' });
//     }

//     // Find cart for the user
//     let cart = await Cart.findOne({ userId });

//     if (!cart) {
//       // If no cart exists, create a new cart with the product
//       cart = new Cart({
//         userId,
//         products: [{ productId, quantity }]
//       });
//     } else {
//       // If the cart exists, check if the product is already in the cart
//       const productIndex = cart.products.findIndex(
//         (item) => item.productId.toString() === productId
//       );

//       if (productIndex > -1) {
//         // If the product is already in the cart, update its quantity
//         cart.products[productIndex].quantity += quantity;
//       } else {
//         // If the product is not in the cart, add it
//         cart.products.push({ productId, quantity });
//       }
//     }

//     // Save the cart
//     await cart.save();
//     res.status(200).json({ success: true, message: 'Product added to cart' });
//   } catch (err) {
//     console.error('Error adding product to cart:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };


// const addToCart = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const { productId } = req.body; // Assuming you are sending productId in the request
//     const product = await Product.findById(productId);

//     if (!product || product.status === 'blocked' || product.status === 'unlisted') {
//       return res.status(400).send('This product is unavailable.');
//     }

//     // Check if the product is already in the cart
//     let cartItem = await Cart.findOne({ userId: user._id, 'products.productId': productId });

//     if (cartItem) {
//       // Product is already in cart, increase the quantity
//       const productInCart = cartItem.products.find(p => p.productId.toString() === productId);
      
//       if (productInCart.quantity < product.stock) {
//         productInCart.quantity++;
//         await cartItem.save();
//       } else {
//         return res.status(400).send('Cannot add more items, stock limit reached.');
//       }
//     } else {
//       // Product is not in cart, add it
//       cartItem = new Cart({
//         userId: user._id,
//         products: [{ productId, quantity: 1 }]
//       });

//       await cartItem.save();
//     }

//     // Remove product from wishlist if it exists
//     await Wishlist.findOneAndUpdate(
//       { userId: user._id },
//       { $pull: { products: productId } }
//     );

//     res.status(200).send('Product added to cart.');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error adding to cart');
//   }
// };


const addToCart = async (req, res) => {
  try {
    const user = req.session.user;
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product || product.status === 'blocked' || product.status === 'unlisted') {
      return res.status(400).json({ success: false, message: 'This product is unavailable.' });
    }

    let cartItem = await Cart.findOne({ userId: user._id, 'products.productId': productId });

    if (cartItem) {
      const productInCart = cartItem.products.find(p => p.productId.toString() === productId);

      if (productInCart.quantity < product.stock) {
        productInCart.quantity++;
        await cartItem.save();
      } else {
        return res.status(400).json({ success: false, message: 'Cannot add more items, stock limit reached.' });
      }
    } else {
      cartItem = new Cart({
        userId: user._id,
        products: [{ productId, quantity: 1 }]
      });
      await cartItem.save();
    }

    await Wishlist.findOneAndUpdate(
      { userId: user._id },
      { $pull: { products: productId } }
    );

    return res.status(200).json({ success: true, message: 'Product added to cart.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding to cart' });
  }
};


const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;
    const action = req.body.action;

    const cart = await Cart.findOne({ userId });

    if (!cart) return res.redirect('/cart');

    const productInCart = cart.products.find(
      p => p.productId.toString() === productId
    );

    if (!productInCart) return res.redirect('/cart');

    if (action === 'increase') {
      // Optional: Check for stock limit here
      productInCart.quantity += 1;
    } else if (action === 'decrease' && productInCart.quantity > 1) {
      productInCart.quantity -= 1;
    }

    await cart.save();
    res.redirect('/cart');
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).send('Internal Server Error');
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;

    await Cart.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );

    res.sendStatus(200); // Respond with success status
  } catch (error) {
    console.error('Failed to remove product from cart:', error);
    res.sendStatus(500);
  }
};




module.exports={getCart,addToCart,updateQuantity,removeFromCart}
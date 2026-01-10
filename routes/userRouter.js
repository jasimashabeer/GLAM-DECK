const express=require('express')
const router=express.Router()
const path = require('path');
const userController=require('../controllers/user/userControllers')
const ProductController=require('../controllers/user/ProductController')
const profileController=require('../controllers/user/profileController')

const cartControllers=require('../controllers/user/cartControllers')
const userProfileControllers=require('../controllers/user/userProfileControllers')
const checkoutController= require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const walletController=require('../controllers/user/walletController')
const wishlistController=require('../controllers/user/wishlistController')
const passport = require('passport')
const {userAuth}=require('../middlewares/auth')

const multer = require('multer');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });





router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
   // Set user ID into session manually
    req.session.user = req.user._id;
    res.redirect('/')
})
router.get('/logout',userController.logout)
router.get('/forgot-password',profileController.getforgotPassword)
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)



router.get('/login',userController.loadlogin)
router.post('/login',userController.login)
//router.get('/welcome',userController.loadwelcome)
router.get("/shop",userAuth,ProductController.loadShoppingPage);
router.get('/productDetails',userAuth,ProductController.productDetails)
router.post('/wishlist/toggle/:id', userAuth,ProductController.toggleWishlist); 



// userProfile routes
router.get('/userProfile',userAuth,userProfileControllers.userProfile)
router.get('/editProfile',userAuth,userProfileControllers.getEditProfile)
router.post('/upload-picture', userAuth, upload.single('profilePicture'), userProfileControllers.profileUpload);

router.get('/changeEmail',userAuth,userProfileControllers.changeEmail)
router.post('/changeEmail',userAuth,userProfileControllers.changeEmailValid)
router.post('/verifyEmailOtp',userAuth,userProfileControllers.verifyEmailOtp)
router.get('/updateEmail',userAuth,userProfileControllers.getNewEmailPage);
router.post('/updateEmail',userAuth,userProfileControllers.updateEmail)

router.get('/validate-pass', userAuth,userProfileControllers.showCurrentPassPage);
router.post("/validate-current-password",userAuth, userProfileControllers.validateCurrentPass)
router.get('/reset-password', userAuth, userProfileControllers.getResetPasswordPage);
router.get('/change-name', userAuth, userProfileControllers.getChangeNamePage);
router.post('/change-name', userAuth, userProfileControllers.updateName);


//address management

router.get('/address', userAuth, userProfileControllers.getAddressPage);
router.post('/addAddress',userAuth,userProfileControllers.postAddAddress)
router.post('/edit-address/:id',userAuth, userProfileControllers.updateAddress);
router.post('/delete-address/:id',userAuth,userProfileControllers.deleteAddress)


// cart management

router.get('/cart', userAuth, cartControllers.loadCartPage);
router.post('/addToCart', userAuth, cartControllers.addToCart);
router.get('/removeFromCart',userAuth,cartControllers.removeProduct)
router.post('/update-quantity',userAuth,cartControllers.updateQuantity)
router.get("/cart/check-blocked", cartControllers.checkBlockedCart);


router.get('/cart/check-stock', cartControllers.checkStockOnly);




// checkout management

router.get('/checkout',userAuth,checkoutController.checkoutPage)
router.post('/place-order',userAuth,checkoutController.placeOrder)
router.get('/order-success',userAuth,checkoutController.orderSuccess)
router.get('/payment-failure',userAuth,checkoutController. paymentFailure);
router.post('/verify-payment',userAuth,checkoutController.verifyPayment);
router.post('/apply-coupon', userAuth, checkoutController.applyCoupon);
router.delete('/remove-coupon', userAuth, checkoutController.removeCoupon);


// order management
router.get('/orders',userAuth,orderController.loadOrders)
router.patch('/cancel-order/:id',userAuth,orderController.cancelOrder)
router.post('/return-order/:id', userAuth, upload.array('images', 3), orderController.returnOrder);
router.get('/view-order/:id', userAuth, orderController.viewOrderDetails);
router.get('/download-invoice/:id',userAuth,orderController.getInvoice)


router.patch('/cancel-product/:orderId/:itemId', userAuth, orderController.cancelProduct);
router.patch('/return-product/:orderId/:itemId', userAuth, upload.array('images', 3), orderController.returnProduct);
router.get('/retry-payment/:orderId',userAuth,orderController.getretryPayment);


// retry payment
router.put('/retry-payment/cod/:orderId', userAuth, orderController.retryCOD);
router.put('/retry-payment/wallet/:orderId', userAuth, orderController.retryWallet);
router.post('/retry-payment/razorpay', userAuth, orderController.retryRazorpay);
router.post('/retry-payment/verify', userAuth, orderController.verifyRetryPayment);



// Wallet Management
router.get('/wallet',userAuth,walletController.loadWalletPage)
router.post('/wallet/createOrder',userAuth,walletController.createOrder)
router.post("/wallet/verifyPayment",userAuth, walletController.verifyPayment);
router.put("/wallet/withdrawMoney",userAuth,walletController.withdrawMoney);



// Wishlist Management
router.get('/wishlist',userAuth,wishlistController.loadWishlist);
router.post('/toggleWishlist', userAuth,wishlistController.toggleWishlist);
router.get('/removeFromWishlist',userAuth,wishlistController.removeProduct)




module.exports=router
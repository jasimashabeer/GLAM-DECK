const express=require('express')
const router=express.Router()
const userController=require('../controllers/user/userControllers')
const ProductController=require('../controllers/user/ProductController')
const profileController=require('../controllers/user/profileController')
const wishlistController=require('../controllers/user/wishlistController')
const cartController=require('../controllers/user/cartController')
const passport = require('passport')
const {userAuth}=require('../middlewares/auth')



router.get('/pageNotfound',userController.pageNotFound)
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
router.get("/products",userAuth,ProductController.getAllProducts);
router.get('/productdetail/:productId',userAuth,ProductController.getProductDetail)
router.post('/wishlist/toggle/:id', userAuth,ProductController.toggleWishlist); 



router.get('/wishlist',wishlistController.getWishlist);
router.post('/wishlist/remove/:id', wishlistController.removeFromWishlist); 

router.get('/cart', cartController.getCart);
router.post('/add-to-cart',userAuth, cartController.addToCart);
router.post('/cart/updateQuantity/:productId', cartController.updateQuantity);
router.post('/cart/remove/:productId', cartController.removeFromCart);
router.get('/sample',(req,res)=>res.render('sample'))









module.exports=router
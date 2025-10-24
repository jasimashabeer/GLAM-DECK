const express=require('express')
const router=express.Router()
const adminController=require('../controllers/admin/adminControllers')
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
const upload = require("../middlewares/uploadMiddleware");
const ProductController=require('../controllers/admin/productController')
const {adminAuth}=require('../middlewares/auth')



router.get('/login',adminController.loadLogin)
router.post('/login',adminController.adminLogin)
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/users',adminAuth,adminController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)



router.get("/category",adminAuth,categoryController.categoryInfo)
router.get("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.get("/editCategory",adminAuth,categoryController.editCategory)
router.put('/editCategory/:id',adminAuth,categoryController.editedCategory);
//router.post("/editCategory/:id",adminAuth,categoryController.editedCategory)
router.delete("/deleteCategory/:id",adminAuth,categoryController.deleteCategory)



router.post("/addproduct", adminAuth,upload.array("images", 3), ProductController.addProduct);
router.get("/editproduct/:id",adminAuth,ProductController.getEditProduct);
router.post("/editproduct/:id",adminAuth,upload.array("newImages", 3), ProductController.postEditProduct);
router.delete("/deleteproduct/:id",adminAuth, ProductController.deleteProduct);
router.get("/viewproduct/:id",adminAuth, ProductController.viewProduct);
router.get("/addproduct",adminAuth,ProductController.getAddProduct);
router.get("/getproduct", adminAuth,ProductController.getAllProducts);





module.exports=router
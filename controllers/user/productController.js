const Product=require('../../models/productSchema')
const Category= require("../../models/categorySchema")
const Wishlist=require('../../models/wishlistSchema')
const User=require('../../models/userSchema')
const mongoose=require('mongoose')


  
  const loadShoppingPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map(cat => cat._id.toString());

    // Extract query params
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const search = req.query.search || '';
    const sort = req.query.sort || 'newest';
    const gt = parseInt(req.query.gt) || 0;
    const lt = parseInt(req.query.lt) || 1000000;
    const categoryFilter = req.query.category || null;

    // Build product query
    const query = {
      isBlocked: false,
      category: { $in: categoryIds },
      regularPrice: { $gt: gt, $lt: lt }
    };

    if (categoryFilter) {
      query.category = categoryFilter;
    }

    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    // Sort
    let sortOption = {};
    if (sort === 'price-asc') sortOption.salePrice = 1;
    else if (sort === 'price-desc') sortOption.salePrice = -1;
    else if (sort === 'name-asc') sortOption.productName = 1;
    else if (sort === 'name-desc') sortOption.productName = -1;
    else sortOption.createdAt = -1; // default: newest

    // Fetch and update products
    let products = await Product.find(query)
      .populate('category')
      .sort(sortOption)
      .lean();

    // Apply best offer logic
    products = products.map(product => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const appliedOffer = Math.max(productOffer, categoryOffer);
      const salePrice = product.regularPrice - (product.regularPrice * appliedOffer / 100);
      return {
        ...product,
        salePrice: Math.round(salePrice),
        appliedOffer
      };
    });

    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = products.slice((page - 1) * limit, page * limit);

    res.render('shop', {
      user: userData,
      products: paginatedProducts,
      category: categories,
      totalPages,
      currentPage: page,
      sort,
      search,
      gt,
      lt,
      selectedCategory: categoryFilter
    });

  } catch (error) {
    console.log("Error loading shop page:", error);
    res.redirect('/pageNotFound');
  }
};





  
 
const productDetails=async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData=await User.findById(userId)
        const productId=req.query.id;
   

        const product=await Product.findById(productId).populate('category')

        
         if (!product || product.isBlocked ) {
      return res.redirect('/shop');
    }


        const findCategory=product.category;
        const categoryOffer = product.category?.categoryOffer || 0;
const productOffer = product.productOffer || 0;
const totalOffer = Math.max(categoryOffer, productOffer);
const salePrice = product.regularPrice - (product.regularPrice * totalOffer / 100);

        const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isBlocked: false,
    //   quantity: { $gt: 0 },
    })
      .limit(4)
      .lean();
        res.render('product-details',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
            salePrice:salePrice,
            relatedProducts,
        })
    } catch (error) {
        console.log('Error for fetching product details',error)
        res.redirect('/pageNotFound')
    }
}


    


  
  const toggleWishlist = async (req, res) => {
      try {
          const userId = req.session.user; // Session now stores just the ID
          const productId = req.params.id;
      
          // Check if the product is already in the wishlist
          const existingEntry = await Wishlist.findOne({ userId, productId });
      
          let added;
          if (existingEntry) {
            // If it exists, remove it 
            await Wishlist.deleteOne({ _id: existingEntry._id });
            added = false;
          } else {
            // If not, add it
            await Wishlist.create({ userId, productId });
            added = true;
          }
      
          res.json({ added });
        
      } catch (err) {
          console.error("Error toggling wishlist:", err);
          res.status(500).json({ success: false, message: "Server error" });
      }
  };
  

  module.exports={loadShoppingPage, productDetails,toggleWishlist}
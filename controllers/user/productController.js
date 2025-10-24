const Product=require('../../models/productSchema')
const Category= require("../../models/categorySchema")
const Wishlist=require('../../models/wishlistSchema')
const User=require('../../models/userSchema')
const mongoose=require('mongoose')


  
      
  

  const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const { category, minPrice, maxPrice, search, sort } = req.query;

    // Base filter (exclude deleted)
    let baseFilter = { status: { $ne: "deleted" } };

    // Build $and array for combining conditions
    let andConditions = [baseFilter];

    //  Category filter
    if (category) {
      const categories = category.split(",");
      if (categories.every(id => mongoose.isValidObjectId(id))) {
        andConditions.push({
          categoryId: { $in: categories.map(id => new mongoose.Types.ObjectId(id)) },
        });
      } else {
        console.log("Invalid category IDs");
      }
    }

    // Price filter
    if (minPrice || maxPrice) {
      let priceCondition = {};
      if (minPrice) priceCondition.$gte = Number(minPrice);
      if (maxPrice) priceCondition.$lte = Number(maxPrice);
      andConditions.push({ price: priceCondition });
    }

    //  Search (case-insensitive, across multiple fields)
    if (search) {
      const regex = new RegExp(search, "i");
      andConditions.push({
        $or: [
          { name: regex },
          { sku: regex },
          { description: regex },
        ],
      });
    }

    // Combine everything
    const filter = { $and: andConditions };

    //  Sorting
    let sortOption = {};
    if (sort === "priceAsc") sortOption.price = 1;
    else if (sort === "priceDesc") sortOption.price = -1;
    else if (sort === "newest") sortOption.createdAt = -1;
    else if (sort === "oldest") sortOption.createdAt = 1;

    // Fetch Products
    const products = await Product.find(filter).sort(sortOption).skip(skip).limit(limit);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch categories
    const categoriesList = await Category.find();

    //  Add discount price logic (you can extend later)
    const updatedProducts = products.map(product => {
      const discountPrice = product.price; // You can calculate later
      return { ...product.toObject(), discountPrice };
    });

    //  Wishlist
    let wishlistItems = [];
    if (req.session.user) {
      const wishlistDocs = await Wishlist.find({ userId: req.session.user._id });
      wishlistItems = wishlistDocs.map(item => item.productId.toString());
    }

    // Render EJS
    res.render("products", {
      products: updatedProducts,
      categories: categoriesList,
      currentPage: page,
      totalPages,
      query: req.query,
      selectedCategories: category ? category.split(",") : [],
      selectedMinPrice: minPrice || "",
      selectedMaxPrice: maxPrice || "",
      selectedSort: sort || "",
      user: req.session.user  || null,
      wishlistItems,
      currentPage: 'products' ,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};



  
  const getProductDetail = async (req, res) => {
    try {
        const productId = req.params.productId;
        console.log("Fetching product with ID:", productId); 
  
        const product = await Product.findById(productId).populate('categoryId');
        console.log("Product fetched:", product); // Debug log

        let wishlistProductIds = [];
        if (req.session.user) {
          const wishlist = await Wishlist.find({ userId: req.session.user._id });
          wishlistProductIds = wishlist.map(item => item.productId.toString());
        }
     
        if (!product) {

            console.log("Product not found");
            return res.status(404).send("Product not found");
           
            
          }
  
       
       
  
        let discountPrice = product.price; // Default: original price
        let maxDiscount = 0;
  
        // Check for product-specific and category-level discounts
     
        // Apply the highest discount
        if (maxDiscount > 0) {
            discountPrice = product.price - (product.price * maxDiscount) / 100;
        }

      
         const relatedProducts = await Product.find({
            _id: { $ne: product._id }, // use the actual ObjectId
            categoryId: product.categoryId._id, // correct field
            status: "Listed" // ensure it's not Blocked/Unlisted
          })
          .limit(4)
          .lean();



  
        res.render("productdetails", {
            product: { ...product.toObject(), discountPrice }, // Add discountPrice dynamically
            user: req.session.user ? { name: req.session.userName } : null,
            relatedProducts,
            wishlistProductIds,
            
        });
       
    
       // res.render('productDetails', { product, relatedProducts });


    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Internal Server Error");
        
    }
  };


  
  const toggleWishlist = async (req, res) => {
      try {
          const userId = req.session.user._id;
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
  

  module.exports={getAllProducts, getProductDetail,toggleWishlist}
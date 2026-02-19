const Product = require('../../models/productSchema')
const Category = require("../../models/categorySchema")
const Wishlist = require('../../models/wishlistSchema')
const User = require('../../models/userSchema')
const mongoose = require('mongoose')



const loadShoppingPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map(cat => cat._id.toString());

    // Extract query params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 6;
    const search = req.query.search || '';
    const sort = req.query.sort || 'newest';

    // Keep track of whether a price filter is actually applied,
    // instead of relying on falsy checks that break for 0. Also guard
    // against NaN values (e.g. when the query contains gt= or lt= with no value).
    const hasGt = typeof req.query.gt !== 'undefined';
    const hasLt = typeof req.query.lt !== 'undefined';

    let gt = null;
    let lt = null;

    if (hasGt) {
      const parsedGt = parseInt(req.query.gt, 10);
      if (!Number.isNaN(parsedGt)) {
        gt = parsedGt;
      }
    }

    if (hasLt) {
      const parsedLt = parseInt(req.query.lt, 10);
      if (!Number.isNaN(parsedLt)) {
        lt = parsedLt;
      }
    }

    const categoryFilter = req.query.category || null;

    // Build base product query
    const query = {
      isBlocked: false,
      isListed: true,
      category: { $in: categoryIds }
    };

    // Apply price filter only when both gt & lt are provided
    if (gt !== null && lt !== null) {
      query.regularPrice = { $gt: gt, $lt: lt };
    }

    if (categoryFilter) {
      query.category = categoryFilter;
    }

    if (search) {
      // Search by product name OR by category name
      const regex = { $regex: search, $options: 'i' };
      // find categories matching search and restrict to listed categories
      const matchingCats = await Category.find({ name: regex }).select('_id').lean();
      const matchingCatIds = matchingCats.map(c => String(c._id)).filter(id => categoryIds.includes(id));

      query.$or = [
        { productName: regex },
        { category: { $in: matchingCatIds } }
      ];
    }

    // Fetch products (we will compute effective salePrice & sort in‑memory to
    // ensure we always sort on the same value that is displayed in the UI)
    let products = await Product.find(query)
      .populate('category')
      .lean();

    // Apply best offer logic and compute accurate salePrice per product.
    // IMPORTANT: when there is no offer, we use the stored salePrice so
    // sorting matches the price the customer actually sees.
    products = products.map(product => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const appliedOffer = Math.max(productOffer, categoryOffer);

      let effectiveSalePrice;
      if (appliedOffer > 0) {
        effectiveSalePrice =
          product.regularPrice - (product.regularPrice * appliedOffer / 100);
      } else {
        effectiveSalePrice = product.salePrice;
      }

      return {
        ...product,
        salePrice: Math.round(effectiveSalePrice),
        appliedOffer
      };
    });

    // Sort in-memory based on selected sort option (ensures sort uses
    // the computed / effective salePrice)
    if (sort === 'price-asc') {
      products.sort((a, b) => (a.salePrice || 0) - (b.salePrice || 0));
    } else if (sort === 'price-desc') {
      products.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
    } else if (sort === 'name-asc') {
      products.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
    } else if (sort === 'name-desc') {
      products.sort((a, b) => (b.productName || '').localeCompare(a.productName || ''));
    } else {
      // default: newest first
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Defensive cleanup: remove any falsy or malformed products that might cause empty slots
    products = products.filter(p => {
      if (!p) return false;
      if (!p.productName) return false;
      if (!p.category) return false;
      // salePrice must be a finite number
      if (!Number.isFinite(Number(p.salePrice))) return false;
      return true;
    });

    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = products.slice((page - 1) * limit, page * limit);

    // Debug logging to help diagnose layout issues
    console.log(`SHOP> page=${page} sort=${sort} totalProducts=${totalProducts} paginated=${paginatedProducts.length}`);
    console.log('SHOP> paginated IDs=', paginatedProducts.map(p => String(p._id)).join(','));

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







const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId)
    const productId = req.query.id;


    const product = await Product.findById(productId).populate('category')


    if (!product || product.isBlocked) {
      return res.redirect('/shop');
    }


    const findCategory = product.category;
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
    res.render('product-details', {
      user: userData,
      product: product,
      quantity: product.quantity,
      totalOffer: totalOffer,
      category: findCategory,
      selectedCategory: findCategory ? String(findCategory._id) : null,
      salePrice: salePrice,
      relatedProducts,
    })
  } catch (error) {
    console.log('Error for fetching product details', error)
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


module.exports = { loadShoppingPage, productDetails, toggleWishlist }
const Product = require('../../models/productSchema')
const Categoey = require('../../models/categorySchema')
const User = require('../../models/userSchema')


const fs = require('fs')
const path = require('path')
const Jimp = require('jimp');


const getProductAddPage = async (req, res) => {

  try {
    const category = await Categoey.find({ isListed: true })

    res.render('product-add', {
      cat: category

    })
  } catch (error) {
    res.redirect('/admin/pageerror')
  }
}
const addProduct = async (req, res) => {
  try {
    const products = req.body;

    // Check if product exists
    const productExists = await Product.findOne({
      productName: products.productName
    });

    if (productExists) {
      return res.status(400).json({ message: "Product already exists" });
    }

    // Validate file uploads
    if (!req.files || req.files.length !== 3) {
      return res.status(400).json({ message: "Exactly 3 images are required" });
    }

    const Jimp = require('jimp');
    const images = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      const originalPath = file.path;
      const resizedName = `resized-${file.filename}`;
      const resizedPath = path.join("public", "uploads", "images", resizedName);

      const img = await Jimp.read(originalPath);
      await img.resize(440, 440).quality(90).writeAsync(resizedPath);

      images.push(resizedName);
    }

    // Category
    const categoryId = await Categoey.findById(products.category);
    if (!categoryId) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const regularPrice = parseFloat(products.regularPrice);
    const categoryOffer = categoryId.categoryOffer || 0;

    const salePrice = Math.round(regularPrice * (1 - categoryOffer / 100));

    const newProduct = new Product({
      productName: products.productName,
      author: products.author,
      description: products.description,
      category: categoryId._id,
      regularPrice,
      salePrice,
      quantity: products.quantity,
      image: images,
      status: "active"
    });

    await newProduct.save();

    return res.status(200).json({ message: "Product created" });

  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({ message: "Server error while saving product" });
  }
};



const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const low = req.query.low === '1'; // checkbox to show low stock products

    const filter = {};

    // Apply search filter
    if (search.trim() !== "") {

      const matchedCategories = await Categoey.find({
        name: { $regex: new RegExp(search, "i") }
      }).select("_id");

      const categoryIds = matchedCategories.map(cat => cat._id);

      filter.$or = [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { author: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { category: { $in: categoryIds } }
      ];
    }

    // Apply low stock filter
    if (low) {
      filter.quantity = { $lt: 5 };
    }

    const productData = await Product.find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('category')
      .exec();

    const count = await Product.countDocuments(filter);

    const category = await Categoey.find({ isListed: true });

    if (category) {
      res.render('products', {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        search,
        low
      });
    } else {
      res.render('page-404');
    }

  } catch (error) {
    console.log(" Error in getAllProducts:", error);
    res.redirect('/admin/pageerror');
  }
};




const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const productDoc = await Product.findOne({ _id: id }).populate('category');

    const product = productDoc.toObject(); // Convert to plain object

    const category = await Categoey.find({});

    res.render('edit-product', {
      product: {
        ...product,
        images: product.image || [], // Ensure `images` exists
      },
      cat: category,
    });

  } catch (error) {
    console.error(error);
    res.redirect('/admin/pageerror');
  }
};



const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id }
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this name already exists.' });
    }

    // Add new images if any
    const newImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        newImages.push(file.filename);
      });
    }

    const product = await Product.findById(id);
    if (!product) return res.redirect('/admin/pageerror');

    // Handle image deletion from form
    const imagesToDelete = Array.isArray(req.body.imagesToDelete) ? req.body.imagesToDelete : (req.body.imagesToDelete ? [req.body.imagesToDelete] : []);

    if (imagesToDelete.length > 0) {
      imagesToDelete.forEach(img => {
        const imagePath = path.join(__dirname, '../public/uploads/images', img);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        const index = product.image.indexOf(img);
        if (index > -1) {
          product.image.splice(index, 1); // remove from array
        }
      });
    }

    // Add new images to existing image array
    if (newImages.length > 0) {
      product.image.push(...newImages);
    }

    // Update other fields
    product.productName = data.productName;
    product.author = data.author;
    product.description = data.description;
    product.category = data.category;
    product.regularPrice = data.regularPrice;
    // product.salePrice = data.salePrice;

    const categoryDoc = await Categoey.findById(product.category);
    const productOffer = product.productOffer || 0;
    const categoryOffer = categoryDoc?.categoryOffer || 0;
    const bestDiscount = Math.max(productOffer, categoryOffer);
    product.salePrice = Math.round(product.regularPrice * (1 - bestDiscount / 100));


    product.quantity = data.quantity;

    await product.save();

    res.redirect('/admin/products');
  } catch (error) {
    console.error("Edit product error:", error);
    res.redirect('/admin/pageerror');
  }
};


const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    // Remove image from product
    await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { image: imageNameToServer }
    });

    // Build image path
    const imagePath = path.join(__dirname, '../public/uploads/images', imageNameToServer);

    // Delete image from filesystem
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found`);
    }

    // Respond with JSON
    res.json({ status: true });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ status: false, message: "Server error while deleting image" }); // ✅ Return JSON, not redirect
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/admin/pageerror')
  }
}

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/admin/pageerror')
  }
}



module.exports = {
  getProductAddPage,
  addProduct,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage

}
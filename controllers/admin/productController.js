const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
//const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;

    let searchQuery = req.query.search || "";
    let categoryFilter = req.query.category || "";
    let priceMin = parseFloat(req.query.minPrice) || 0;
    let priceMax = parseFloat(req.query.maxPrice) || Infinity;

    // Base filter: always exclude deleted
    let filter = { status: { $ne: "deleted" } };

    // Add category filter
    if (categoryFilter) {
      const category = await Category.findOne({ name: categoryFilter });
      if (category) {
        filter.categoryId = category._id;
      }
    }

    // Add price filter
    filter.price = { $gte: priceMin, $lte: priceMax };

    // Build search condition separately
    let searchCondition = {};
    if (searchQuery) {
      searchCondition = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { sku: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    // Combine filters properly using $and
    let finalFilter = { $and: [filter, searchCondition] };

    const totalProducts = await Product.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(finalFilter)
      .populate("categoryId", "name")
      .skip(skip)
      .limit(limit)
      .exec();

    res.render("productlist", {
      products,
      currentPage: page,
      totalPages,
      searchQuery,
      categoryFilter,
      priceMin,
      priceMax,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/admin/pageError");
  }
};



const getAddProduct = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render("addproduct", { title: "Add Product", categories });
    } catch (error) {
        console.error("Error loading add product page:", error);
        res.status(500).send("Server Error");
    }
};






const addProduct = async (req, res) => {
    try {
       
        const { name, categoryId, material, color, description, price, sku, quantity, isFeatured } = req.body;

       
    
    
    //  Case-insensitive duplicate check
    const existingProduct = await Product.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (existingProduct) {
          const categories = await Category.find();
           return res.json({ success: false, message: "Product with this name already exists." });
//      return res.render('addproduct', {
//     categories,      // make sure to pass your categories
//     errorMessage: 'Product with this name already exists.'
//   });
    }






        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        
        // Validate image mimetypes
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const invalidFiles = req.files.filter(file => !allowedTypes.includes(file.mimetype));

        if (invalidFiles.length > 0) {
            // Delete uploaded invalid files
            for (const file of req.files) {
                await fs.promises.unlink(file.path);
            }
            return res.status(400).json({ error: "Only image files (jpeg, png, gif, webp) are allowed." });
        }


        const imagePaths = req.files.map((file) =>`/uploads/${file.filename}`);

        
        const productId =`PROD-${Date.now()}`;

        const newProduct = new Product({
            productId,
            name,
            material,
            color,
            description,
            price: parseFloat(price),
            sku,
            image: imagePaths,
            quantity: parseInt(quantity),
            categoryId,
            isFeatured: isFeatured === "on",
            stockStatus: quantity > 0 ? "In Stock" : "Out of Stock",
        });

        await newProduct.save();
       
     res.json({ success: true, message: "Product added successfully!" });
       // return res.redirect("/admin/getproduct"); 

    } catch (error) {
        console.error("Error adding product:", error);

      
        if (req.files) {
            req.files.forEach((file) => {
                const tempPath = file.path;
                setTimeout(async () => {
                    try {
                        await fs.promises.unlink(tempPath);
                        console.log("Temp file deleted:", tempPath);
                    } catch (unlinkErr) {
                        console.error("Error deleting temp file:", unlinkErr);
                    }
                }, 500);
            });
        }
        if (error.code === 11000 && error.keyValue?.sku) {
        return res.json({ success: false, message: `SKU "${error.keyValue.sku}" already exists.` });
    }

        res.status(500).json({ error: "Something went wrong while adding the product" });
    }
};

const viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("categoryId");

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render("viewproduct", { product });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Server Error");
    }
};


const postEditProduct = async (req, res) => {
    try {
        
       
        const productId = req.params.id;
        const { name, category, material, sku, price, description, color, quantity, deleteImages,status } = req.body;
        const updatedQuantity = parseInt(quantity, 10);
       
        let product = await Product.findById(productId);
        if (!product) {
           
            return res.status(404).send("Product not found");
        }

        const categoryData = await Category.findById(category);
        if (!categoryData) {
           
            return res.status(400).send("Error: Selected category does not exist.");
        }

    
        if (deleteImages) {
            const imagesToDelete = Array.isArray(deleteImages) ? deleteImages : [deleteImages];

            

            product.image = product.image.filter(img => !imagesToDelete.includes(img));

            imagesToDelete.forEach(img => {
                const filePath = path.join(__dirname, "../../public/uploads", path.basename(img));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted image: ${filePath}`);
                }
            });
        }

        if (req.files && req.files.length > 0) {
            console.log("New images received:", req.files);
            
            req.files.forEach(file => {
                product.image.push("/uploads/" + file.filename);
            });
        } else {
            console.log("No new images found in request.");
        }

       
        product.name = name;
        product.categoryId = categoryData._id;
        product.material = material;
        product.sku = sku;
        product.price = price;
        product.description = description;
        product.color = color;
        product.quantity = updatedQuantity;
        product.status = status;
        //product.stockStatus = quantity == 0 ? "Out of Stock" : "In Stock";
        if (updatedQuantity === 0) {
            product.stockStatus = "Out of Stock";
        } else {
            product.stockStatus = "In Stock";
        }

       

        await product.save();

       

     
        res.redirect(`/admin/editproduct/${productId}?updated=true`);

        

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Server Error");
    }
};

const getEditProduct= async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send("Product not found");
        }

        const categories = await Category.find(); 
        res.render("editProduct", { 
            product, 
            categories
        });
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        res.status(500).send("Server Error");
    }
};


const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }

     
        // if (product.image && product.image.length > 0) {
        //     product.image.forEach(imgPath => {
        //         const filePath = path.join(__dirname, "../../public", imgPath);
        //         if (fs.existsSync(filePath)) {
        //             fs.unlinkSync(filePath);
        //         }
        //     });
        // }


        //soft delete
        product.status='deleted'

        await product.save();

        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Something went wrong!" });
    }
}




module.exports={getAllProducts,getAddProduct,addProduct,getEditProduct,postEditProduct,viewProduct,deleteProduct}
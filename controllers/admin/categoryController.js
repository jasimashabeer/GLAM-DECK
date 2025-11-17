const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')


const categoryInfo=async(req,res)=>{
    try {
      
        const search=req.query.search || ""
        const page=parseInt(req.query.page) || 1;
        const limit=3;
        const skip=(page-1)*limit;

        const searchFilter={
          name:{$regex:new RegExp(".*"+search+".*","i")}
        }

        const categoryData = await Category.find(search?searchFilter:{})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategories=await Category.countDocuments(search?searchFilter:{})

        const totalPages=Math.ceil(totalCategories/limit)
        res.render('category',{
           cat:categoryData,
           currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories,
             search: search 
        })
        
    } catch (error) {
        console.error(error)
        res.redirect('/admin/pageerror')
    }
}




const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') } // Case-insensitive match
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exist' });
    }

    const newCategory = new Category({
      name,
      description,
    });

    await newCategory.save();
    return res.json({ message: 'Category added successfully' });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    // 1️⃣  save category offer
    category.categoryOffer = percentage;
    await category.save();

    // 2️⃣  update every product's SALE PRICE (do NOT overwrite productOffer)
    const products = await Product.find({ category: category._id });

    for (const product of products) {
      const bestOffer = Math.max(product.productOffer || 0, percentage);
      product.salePrice = Math.floor(
        product.regularPrice - (product.regularPrice * bestOffer / 100)
      );
      await product.save();
    }

    res.json({ status: true });

  } catch (error) {
    console.error("Add Category Offer Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });

    for (const product of products) {
      const productOffer = product.productOffer || 0; // Keep product offer if exists
      const offer = productOffer;
      
      if (offer > 0) {
        product.salePrice = Math.floor(
          product.regularPrice - (product.regularPrice * offer / 100)
        );
      } else {
        product.salePrice = product.regularPrice; // No offers at all
      }

      await product.save();
    }

    category.categoryOffer = 0; // ✅ Only remove category-level offer
    await category.save();

    res.json({ status: true });
  } catch (error) {
    console.error("Remove Category Offer Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


  const getEditCategory=async(req,res)=>{
    try {
      const id=req.query.id;
      const category=await Category.findOne({_id:id})
      res.render('edit-category',{category:category })
    } catch (error) {
      res.redirect('/admin/pageerror')
    }
  }

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;

    const existingCategory = await Category.findOne({ 
      name: { $regex: `^${categoryName}$`, $options: 'i' }, // case-insensitive exact match
      _id: { $ne: id } // exclude current category
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists, please choose another name' });
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, {
      name: categoryName,
      description: description,
    }, { new: true });

    if (updatedCategory) {
      return res.status(200).json({ message: 'Category updated successfully' });
    } else {
      return res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    console.error('Edit Category Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getListCategory=async(req,res)=>{
  try {
    let id=req.query.id
    await Category.updateOne({_id:id},{$set:{isListed:false}})
    res.redirect('/admin/category')
  } catch (error) {
    res.redirect('/admin/pageerror')
  }
}

const getUnlistcategory=async(req,res)=>{
  try {
    let id=req.query.id;
    await Category.updateOne({_id:id},{$set:{isListed:true}})
    res.redirect('/admin/category')
  } catch (error) {
    res.redirect('/admin/pageerror')
  }
}

const deleteCategory=async(req,res)=>{
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ status: true });
  } catch (error) {
     console.error("Delete category error:", error);
     
     res.redirect('/admin/pageerror')
  }
}
  module.exports={
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistcategory,
    deleteCategory,

  }
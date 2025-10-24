const Category=require('../../models/categorySchema')


// const categoryInfo=async(req,res)=>{
//     try{
//         const page=parseInt(req.query.page)||1
//         const limit=4
//         const skip=(page-1)*limit
//         const searchQuery = req.query.search || ""; 
//         let filter = {status: "Listed",};   //only listed are displying
//         if (searchQuery) {
//             filter = { name: { $regex: searchQuery, $options: "i" } }; 
//         }

//         const categoryData=await Category.find(filter)
//         .sort({createdAt:-1})
//         .skip(skip)
//         .limit(limit)
//        const totalCategories=await Category.countDocuments(filter)
//        const totalPages=Math.ceil(totalCategories/limit)
//        res.render("category",{
//         cat:categoryData,
//         currentPage:page,
//         totalPages:totalPages,
//         totalCategories:totalCategories,
//         searchQuery,
//        })

//     }
//     catch(error){
//         console.error(error)
//         res.redirect('/pageError')
       
//     }
// }


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || "";

        // filter to show only listed
        let filter = { status: "Listed" };

        // if any search query filter is
        if (searchQuery) {
            filter.name = { $regex: searchQuery, $options: "i" }; // case-insensitive search 
        }

        //  applied filter, sorted, pagination, and limit
        const categoryData = await Category.find(filter)
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .skip(skip)
            .limit(limit);

        // Get total count 
        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories / limit);

        // Render the categories page with data
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            searchQuery, // Pass the current search query to the frontend
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
};






const addCategory=async(req,res)=>{
    const {name,description}=req.body
    console.log("received data",{name,description})

    try{
        const existingCategory=await Category.findOne({name: { $regex: `^${name}$`, $options: "i" } })

        if(existingCategory){
            console.log("category exists")
            return res.status(400).json({message:"Category already exists"})
        }
        const newCategory=new Category({
            name,description
        })
        await newCategory.save()
        console.log(" Category added successfully!");
        return res.status(201).json({message:"Category added successfully"})

    }  
   catch(error){
    console.log("error adding category",error)
        return res.status(500).json({error:"Internal server error"})
  
    }
}

const editCategory = async (req, res) => {
  try {
    const id = req.query.id; 
    const category = await Category.findById(id);
    res.render("editCategory", { category });
  } catch (error) {
    console.error(error);
    res.redirect("/pageError");
  }
};

const editedCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { categoryName, description, status } = req.body;

    // Case-insensitive duplicate check
    const existingCategory = await Category.findOne({
      _id: { $ne: categoryId }, // exclude current category
      name: { $regex: `^${categoryName}$`, $options: "i" } // case-insensitive
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists"
      });
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name: categoryName, description, status },
      { new: true }
    );

    if (updatedCategory) {
      return res.status(200).json({
        success: true,
        message: "Category updated successfully!"
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};





// const editedCategory = async (req, res) => {
//   try {
//     const categoryId = req.params.id; 
//     const { categoryName, description, status } = req.body;

//     // Check for duplicate name
//     const existingCategory = await Category.findOne({
//         name: { $regex: `^${categoryName}$`, $options: "i" }, // case-insensitive
//      // name: categoryName,
//       _id: { $ne: categoryId },
//     });

//     if (existingCategory) {
//       const category = await Category.findById(categoryId);
//       return res.render("editCategory", {
//         category,
//         errorMessage: "Category name already exists",
//       });
//     }

//     // Update category
//     const updatedCategory = await Category.findByIdAndUpdate(
//       categoryId,
//       { name: categoryName, description, status },
//       { new: true }
//     );

//     if (updatedCategory) {
//      // return res.redirect("/admin/category"); 
//      if (updatedCategory) {
//   return res.status(200).json({ 
//     success: true, 
//     message: "Category updated successfully!" 
//   });
// } else {
//   return res.status(404).json({ 
//     success: false, 
//     message: "Category not found or update failed." 
//   });
// }
//     } else {
//       console.log("Category not found or update failed");
//       return res.redirect("/pageError");
//     }
//   } catch (error) {
//     console.error("Error updating category:", error);
//     res.redirect("/pageError");
//   }
// };



// const editCategory=async(req,res)=>{
//     try{
//         const id=req.query.id
//         const category=await Category.findOne({_id:id})
//         res.render("editCategory",{category:category})
//     }
//     catch(error){
//        res.redirect("/pageError")
       

//     }
   

// }

// const editedCategory = async (req, res) => {
//     try {
//         const categoryId = req.params.id; 
//         const { categoryName, description, status } = req.body; 

       
//         const existingCategory = await Category.findOne({ 
//             name: categoryName, 
//             _id: { $ne: categoryId } 
//         });

//         if (existingCategory) {
//             // Render the edit page with an error message
//             const category = await Category.findById(categoryId); // Fetch the category again
//             return res.render("editCategory", {
//                 category,
//                 errorMessage: "Category name already exists"
//             });
//         }
//         const updateCategory = await Category.findByIdAndUpdate(
//             categoryId,
//             { name: categoryName, description, status },
//             { new: true }
//         );

//         if (updateCategory) {
//             res.redirect('category'); // Redirect to category list after update
//         }  else {
//          console.log("error")
//         }
    
//             }catch (error) {
//             console.error("Error updating category:", error);
            
//             res.status(500).json({ error: "Internal server error" });
            
//         }

// };

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        //implementing softdelete
        const deletedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { $set: { status: "Unlisted" } },
            { new: true }
          );

        if (!deletedCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
       
    }
};










module.exports={categoryInfo,editCategory,addCategory,editedCategory,deleteCategory}
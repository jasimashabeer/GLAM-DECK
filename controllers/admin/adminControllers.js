const express=require ('express')
const User=require('../../models/userSchema')
const env=require('dotenv').config();
const bcrypt=require('bcrypt')



const loadLogin= async (req,res)=>{
   try{ if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
    return res.render('adminLoginPage')
   }catch{
   console.log("some thing went wrong")
   res.status(500).send("login page not found")
   }
}


const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
       //console.log("login body",req.body)
        const adminUser = await User.findOne({ email, isAdmin: true });
       //console.log(adminUser)

        if (!adminUser) {
          // console.log("no admin found")
            return res.render("adminLoginPage", { error: "Admin not found!" });
        }
       // console.log("console2")

        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
          //  console.log("console3")
            return res.render("adminLoginPage", { error: "Invalid credentials!" });
        }

       
        req.session.admin = adminUser._id;

      
        return res.redirect("dashboard");
    } 
    catch (error) {
        console.error("Error during login:", error);
        return res.json("error")
    }
};


const loadDashboard=async (req,res)=>{
    try{
        
return res.render('dashboard')
    }catch (error){

    }
}

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 10;

      
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex:  search  , $options: "i" } }, 
                { email: { $regex: search , $options: "i" } }
            ],
        })
        .sort({ createdAt: -1 }) // sort latest first
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

       
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: "." + search + ".", $options: "i" } },
                { email: { $regex: "." + search + ".", $options: "i" } },
            ],
        });

   
        const totalPages = Math.ceil(count / limit);

        // Render page and pass data
        res.render("customers", {
            customers: userData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search
        });

    } catch (error) {
        console.error("Error fetching customer data:", error);
      res.status(500).send("error")
    }
};

module.exports={loadLogin,adminLogin,loadDashboard,customerInfo}
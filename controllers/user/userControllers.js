const { text } = require('express');
const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const env=require('dotenv').config();
const nodemailer=require('nodemailer')
const bcrypt=require('bcrypt')



const pageNotFound= async(req,res)=>{
  try{
  res.render("pageNotFound")
  }catch(error){
console.log("error")
  }
}



// const loadHomepage= async(req,res)=>{
//     try{
     

//     const products = await Product.find(filter).sort(sortOption).skip(skip).limit(limit);

//      return res.render('home')
//     }catch(error){
//      console.log('Homepage not found',error)
//      res.status(500).send("server error")
//     }
// }

const loadHomepage = async (req, res) => {
  try {
    // Fetch latest 8 "Listed" products (not blocked or deleted)
    const products = await Product.find({ status: "Listed" })
      .sort({ createdAt: -1 })
      .limit(4);

    return res.render("home", { products:products });
  } catch (error) {
    console.log("Homepage not found:", error);
    res.status(500).send("Server error");
  }
};






const loadSignup=async(req,res)=>{
  try{
return res.render('signup')
  }catch(error){
console.log("home page is not loading",error)
res.status(500).send('Server Error')
  }
}


function generateOtp(){
  return Math.floor(100000+Math.random()*900000).toString()
  
}


async function  sendVerificationEmail(email,otp){
try{
  const transporter=nodemailer.createTransport({
    service:'gmail',
    port:587,
    secure:false,
    requireTLS:true,
    auth:{
      user:process.env.NODEMAILER_EMAIL,
      pass:process.env.NODEMAILER_PASSWORD
    }
  })

  const info=await transporter.sendMail({
    from:process.env.SENDMAILER_EMAIL,
    to:email,
    subject:"verify your account",
    text:`your otp is ${otp}`,
    html:`<b>your otp : ${otp}</b>`
  })

  return info.accepted.length>0
}catch(error){
  console.log("Error in sending email",error)
  return false

}



}



const signup=async(req,res)=>{
  try{
const{name,phone,email,password,confirmPassword}=req.body
if(password!==confirmPassword){
  return res.render("signup",{message:"password do not match"})
}


const findEmail=await User.findOne({email})
if(findEmail){
  return res.render("signup",{message:"User with this Email Alredy exist"})
}

const otp=generateOtp();
const emailSent=await sendVerificationEmail(email,otp)

if(!emailSent){
  return res.json("email_error")
}
req.session.userOtp=otp
// console.log("the otp is",otp)
req.session.userData={name,phone,email,password,}

res.render("verify-otp")
console.log("otp sent",otp)
  }catch(error){
console.error("signup error",error)
res.redirect("Page404")
  }
}

const securePassword= async(password)=>{
  try{
  const passwordHash=await bcrypt.hash(password,10)
  return passwordHash
  }catch(error){

  }
}

const verifyOtp= async(req,res)=>{
  try{
    console.log(req.body,"abc")
    const {otp}=req.body
    // console.log("otp is",otp)
    console.log(" OTP:", req.session.userOtp);//added
  
    if(otp==req.session.userOtp){
      const user=req.session.userData
      console.log("console1",user)
      const passwordHash=await securePassword(user.password)
      

      const saveUserData= new User({
        name:user.name,
        email:user.email,
        password:passwordHash,
        phone:user.phone
      })
      await saveUserData.save()
      
      // Clear any existing admin session when user signs up
      if (req.session.admin) {
          delete req.session.admin;
      }
      
      // Store only user ID in session (consistent with login)
      req.session.user = saveUserData._id;
      req.session.userId = saveUserData._id; // Keep for backward compatibility if needed
      
      res.json({success:true,redirectUrl:'/'})
    }else{
      res.json({success:false,message:"Invalied OTP, please try again"})
    }
  }catch(error){
  console.error(" Error Verifyin OTP",error)
  res.status(500).json({success:false,message:"an Error Occured"})
  }
  
  
}

const resendOtp=async (req,res)=>{
  try{
   const {email}=req.session.userData
   if(!email){
    return res.status(400).json({success:false,message:"Email not found in session"})
    
   }
   const otp=generateOtp()
   req.session.userOtp=otp
   const emailSent= await sendVerificationEmail(email,otp)
    if(emailSent){
      console.log("Resend Otp",otp)
      res.status(200).json({success:true,message:"Otp Resend Successfully"})
    }
   else{
    res.status(500).json({success:false,message:"Failed to Resend, Please Try Again"})
   }

  }catch{
  console.error("Error Resending Otp",error)
  res.status(500).json({success:false,message:"Internal Server Error. Please Try Again"})
  }
}


const loadlogin= async (req,res)=>{
  try{
    if(!req.session.user){
      return res.render('login')
    }
    // req.session.user is now just the ID, not an object
    const user = await User.findById(req.session.user);
    console.log(user)

        if (user && user.isBlocked) {
            req.session.destroy(); 
            return res.render('login');
        }

        res.redirect('/');

  // return res.render('login')
  }catch{
  console.log("some thing went wrong")
  res.status(500).send("login page not found")
  }
}

const login = async(req,res)=>{
  try {
      const {email,password} = req.body
      const findUser = await User.findOne({isAdmin: false, email: email});
      if(!findUser){
          return res.render('login',{message:'User not found'});
      }

      if(findUser.isBlocked){
          return res.render('login',{message:'User is blocked by admin'});
      }

      const passwordMatch = await bcrypt.compare(password, findUser.password)

      if(!passwordMatch){
          return res.render('login',{message:'Incorrect password'});
      }
      
      // Clear any existing admin session when user logs in
      if (req.session.admin) {
          delete req.session.admin;
      }
      
      // Store only user ID in session (consistent with admin session)
      req.session.user = findUser._id;
      req.session.userId = findUser._id; // Keep for backward compatibility if needed
      
      // res.render('home')
      res.redirect('/')
  } catch (error) {
      console.error('Login error',error);
      res.render('login',{message:'Login failed. Please try again later.'})
  }
}

const loadwelcome= async (req,res)=>{
  try{
   return res.render('welcome')
  }catch{
  console.log("some thing went wrong")
  res.status(500).send("login page not found")
  }
}




const showproducts= async (req,res)=>{


}



const logout=async(req,res)=>{
  try{
    // Clear only user session, preserve admin session if exists
    // (though in practice, user and admin sessions should be mutually exclusive)
    if (req.session.user) {
        delete req.session.user;
        delete req.session.userId;
    }

    // If no admin session exists, destroy the entire session
    if (!req.session.admin) {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/login');
        });
    } else {
        // If admin session exists, just redirect (shouldn't happen, but handle it)
        return res.redirect('/login');
    }
  }catch(error){
    console.log('Unexpected logout error:', error);
    res.redirect('/pageNotFound');
  }
}


module.exports={loadHomepage,pageNotFound,loadSignup,signup,verifyOtp,
  resendOtp,loadlogin,login,loadwelcome,showproducts,logout
}
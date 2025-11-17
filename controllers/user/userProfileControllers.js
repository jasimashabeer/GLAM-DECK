const User=require('../../models/userSchema')
const nodemailer=require('nodemailer')
const bcrypt=require('bcrypt')
const env=require('dotenv').config();
const session=require('express-session');
const { text } = require('express');
const Address = require('../../models/addressSchema');
const path = require('path');
const Order = require('../../models/orderSchema');

function generateOtp(){
    const digits="1234567890"
    let otp=""
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}



const sendVerificationEmail= async(email,otp)=>{
try{
    const transporter=nodemailer.createTransport({
        service:'gmail',
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD,
        }
    })


    const mailOptions={
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"our otp forpassword reset",
        text:`Your ot is ${otp}`,
        html:`<b><h4>your otp:${otp}</h4></b>`
    }
    const info=await transporter.sendMail(mailOptions)
    console.log("email sent",info.messageId)
    return true
}catch(error){
   console.log("error sending email",error)
   return false
}
}







const userProfile=async(req,res)=>{
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        const addressData=await Address.findOne({userId:userId});
       res.render('profile', {
  user: {
    ...userData.toObject(),
    addresses: addressData ? addressData.address : []
  }
});

    } catch (error) {
        console.error('Error for retrieve profile data',error)
        res.redirect('/pageNotFound')
    }
}







 const getEditProfile=async(req,res)=>{
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        res.render('editProfile',{
            user:userData
        })
    } catch (error) {
        console.error('Error for retrieve edit profile data',error)
        res.redirect('/pageNotFound')
    }
}






const profileUpload = async (req, res) => {
  try {
    const userId = req.session.user;
    const filePath = '/images/' + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { image: filePath } }, 
      { new: true }                    
    );

    console.log(" Image path saved to DB:", updatedUser.image); // Check this

    res.redirect('/editProfile');
  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};




const changeEmail=async(req,res)=>{
    try {
        res.render('changeEmail')
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}





const changeEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    // Get current logged-in user's email from session
    const currentUser = req.session.user;

    if (!currentUser) {
      return res.redirect('/login'); // Or redirect to error page
    }

    // Only proceed if entered email matches logged-in user's email
    if (email !== currentUser.email) {
      return res.render('changeEmail', {
        message: 'Please enter your current email address.'
      });
    }

    // Send OTP only to current user email
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
              console.log(' OTP for email verification:', otp);
      req.session.userOtp = otp;
      req.session.userData = req.body;
      req.session.email = email;


      return res.render('changeEmailOtp');
    } else {
      return res.render('changeEmail', {
        message: 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.log(error);
    return res.redirect('/pageNotFound');
  }
};



const verifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = String(req.body.otp).trim();
    const sessionOtp = String(req.session.userOtp).trim();

    console.log('Entered OTP:', enteredOtp);


    if (enteredOtp === sessionOtp) {
      return res.json({
        success: true,
        redirectUrl: '/updateEmail' 
      });
    } else {
      return res.json({
        success: false,
        message: 'OTP not matching'
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

const getNewEmailPage=async(req,res)=>{
    try {
        if (!req.session.userOtp) {
    return res.redirect('/changeEmail');   // or wherever the flow starts
  }

  return res.render('newEmail', {
    userData:       req.session.userData || {},
    successMessage: 'OTP verified successfully!'
  });
    } catch (error) {
     res.redirect('/pageNotFound')   
    }
}




const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.body.user || req.session.user?._id;

    if (!userId) {
      throw new Error('User ID not found');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true }
    );

    // Update session email
    if (req.session.user) {
      req.session.user.email = updatedUser.email;
    }

    res.render('profile');
  } catch (error) {
    console.error('Error updating email:', error);
    res.redirect('/pageNotFound');
  }
};




const showCurrentPassPage = (req, res) => {
  res.render('changePassword', { message: null }); // render your EJS page
};

const validateCurrentPass = async (req, res) => {
  try {
    const userId = req.session.user; 
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.render("changePassword", { message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("changePassword", { message: "Incorrect current password" });
    }

    return res.render("resetPassword");
  } catch (error) {
    console.error(error);
    return res.render("changePassword", { message: "Internal server error" });
  }
};

const getResetPasswordPage = async (req, res) => {
  try {
   
    res.render('resetPassword'); 
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};

const getChangeNamePage = (req, res) => {
  try {
    const userName = req.session.user.name;
    res.render('changeName', { currentName: userName });
  } catch (err) {
    res.redirect('/pageNotFound');
  }
};



const updateName = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const newName = req.body.newName.trim();

    if (!newName || newName.length < 3) {
      return res.render('changeName', {
        currentName: req.session.user.name,
        message: 'Name must be at least 3 characters long'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, {
      name: newName
    }, { new: true });

    // Update session
    req.session.user.name = updatedUser.name;

    res.render('profile');
  } catch (err) {
    console.error('Name change failed:', err);
    res.redirect('/pageNotFound');
  }
};




const getAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId });

    const addresses = addressData ? addressData.address : [];

    res.render('address', {
      user: {
        ...userData.toObject(),
        addresses
      }
    });
  } catch (err) {
    console.error('Error loading address page:', err);
    res.redirect('/pageNotFound');
  }
};



const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { name, locality, city, state, pincode, mobile, alternatePhone } = req.body;

    const existing = await Address.findOne({ userId });

    const newAddressObj = {
      name,
      locality,
      city,
      state,
      pincode,
      mobile,
      alternatePhone
    };

    if (!existing) {
      const addressDoc = new Address({
        userId,
        address: [newAddressObj]
      });
      await addressDoc.save();
    } else {
      existing.address.push(newAddressObj);
      await existing.save();
    }

    return res.redirect('/address'); 
  } catch (err) {
    console.error("Error in postAddAddress:", err);
    return res.redirect('/pageNotFound');
  }
};



const updateAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      addressId,
      name,
      locality,
      city,
      state,
      pincode,
      mobile,
      alternatePhone
    } = req.body;


    const updated = await Address.updateOne(
      { userId, "address._id": addressId },
      {
        $set: {
          "address.$.name": name,
          "address.$.locality": locality,
          "address.$.city": city,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.mobile": mobile,
          "address.$.alternatePhone": alternatePhone
        }
      }
    );

    if (updated.modifiedCount === 0) {
      console.log("⚠ No address was updated. Possibly wrong ID or user.");
    }

    return res.redirect('/address');
  } catch (err) {
    console.error("❌ Error in updateAddress:", err);
    return res.redirect('/pageNotFound');
  }
};

const deleteAddress=async(req,res)=>{
try {
    const userId=req.session.user
    const addressId=req.params.id

    await Address.updateOne({userId},{$pull:{address:{_id:addressId}}})

    res.redirect('/address')
} catch (error) {
    console.log("Error in deleting address",error)
    re.redirect('/pageNotFound')
}
}





module.exports={userProfile,getEditProfile,changeEmail,changeEmailValid,verifyEmailOtp,
  getNewEmailPage,updateEmail,showCurrentPassPage,getResetPasswordPage,validateCurrentPass,
getChangeNamePage,updateName,profileUpload,getAddressPage,postAddAddress,updateAddress,deleteAddress}
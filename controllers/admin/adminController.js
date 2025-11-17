const User=require('../../models/userSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')

const pageerror=async(req,res)=>{
    res.render('admin-error')
}

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin-login',{message:null})
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('admin-login', { message: 'Please enter both email and password' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('admin-login', { message: 'Please enter a valid email address' });
        }

        const admin = await User.findOne({ email, isAdmin: true });
        if (!admin) {
            return res.render('admin-login', { message: 'Admin not found' });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.render('admin-login', { message: 'Incorrect password' });
        }

        req.session.admin = admin._id; 

        return res.render('dashboard');
    } catch (error) {
        console.log('Login error:', error);
        return res.redirect('/admin/pageerror');
    }
};

const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashboard')
        } catch (error) {
            res.redirect('/admin/pageerror')
        }
    }
}

const logout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log('Error destroying session',err)
                return res.redirect('/admin/pageerror')
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('unexpected error during logout',error);
        res.redirect('/admin/pageerror')       
    }
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}
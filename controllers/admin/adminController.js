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

        // Clear any existing user session when admin logs in
        if (req.session.user) {
            delete req.session.user;
        }
        if (req.session.userId) {
            delete req.session.userId;
        }

        req.session.admin = admin._id; 

        return res.redirect('dashboard');
    } catch (error) {
        console.log('Login error:', error);
        return res.redirect('/admin/pageerror');
    }
};



const logout=async(req,res)=>{
    try {
        // Clear only admin session, preserve user session if exists
        // (though in practice, user and admin sessions should be mutually exclusive)
        if (req.session.admin) {
            delete req.session.admin;
        }

        // If no user session exists, destroy the entire session
        if (!req.session.user) {
            req.session.destroy(err=>{
                if(err){
                    console.log('Error destroying session',err)
                    return res.redirect('/admin/pageerror')
                }
                res.redirect('/admin/login')
            })
        } else {
            // If user session exists, just redirect (shouldn't happen, but handle it)
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.log('unexpected error during logout',error);
        res.redirect('/admin/pageerror')       
    }
}

module.exports={
    loadLogin,
    login,
    pageerror,
    logout
}
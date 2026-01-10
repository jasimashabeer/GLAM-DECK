const User=require("../models/userSchema")




const userAuth = async (req, res, next) => {
    try {
        // Check if user session exists
        if (!req.session.user) {
            return res.redirect("/login"); 
        }

        // Ensure no admin session exists (prevent cross-access)
        if (req.session.admin) {
            // Clear admin session if user session exists
            delete req.session.admin;
        }

        const user = await User.findById(req.session.user);

        // Verify user exists, is not blocked, and is NOT an admin
        if (user && !user.isBlocked && !user.isAdmin) {
            next(); 
        } else {
            // Clear invalid session
            req.session.user = null;
            res.redirect("/login"); 
        }
    } catch (error) {
        console.error("Error in user authentication middleware:", error);
        res.status(500).send("Internal server error");
    }
}





const adminAuth = async (req, res, next) => {
    try {
        // Check if admin session exists
        if (!req.session.admin) {
            return res.redirect("/admin/login");  
        }

        // Ensure no user session exists (prevent cross-access)
        if (req.session.user) {
            // Clear user session if admin session exists
            delete req.session.user;
            delete req.session.userId;
        }

        const adminUser = await User.findById(req.session.admin);
        
        // Verify admin exists and is actually an admin
        if (adminUser && adminUser.isAdmin) {
            return next(); 
        } else {
            // Clear invalid session
            req.session.admin = null;
            console.log("admin not found or not authorized...")
            return res.redirect("/admin/login"); 
        }
    } catch (error) {
        console.error("Error in admin auth middleware:", error);
        res.status(500).send("Internal server error");
    }
};

module.exports={userAuth,adminAuth}
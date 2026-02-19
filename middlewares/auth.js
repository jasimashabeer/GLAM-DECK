const User = require("../models/userSchema")




const userAuth = async (req, res, next) => {
    try {
        // Check if user session exists
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.user);

        // Verify user exists, is not blocked, and is NOT an admin
        if (user && !user.isBlocked && !user.isAdmin) {
            // Allow access - both user and admin sessions can coexist
            // We don't check or modify admin session here to prevent interference
            // Sessions are separate and should not affect each other during normal operations
            next();
        } else {
            // Clear invalid user session only - preserve admin session if it exists
            req.session.user = null;
            if (req.session.userId) {
                delete req.session.userId;
            }
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

        const adminUser = await User.findById(req.session.admin);

        // Verify admin exists and is actually an admin
        if (adminUser && adminUser.isAdmin) {
            // Allow access - both user and admin sessions can coexist
            // We don't check or modify user session here to prevent interference
            // Sessions are separate and should not affect each other during normal operations
            return next();
        } else {
            // Clear invalid admin session only - preserve user session if it exists
            req.session.admin = null;
            console.log("admin not found or not authorized...")
            return res.redirect("/admin/login");
        }
    } catch (error) {
        console.error("Error in admin auth middleware:", error);
        res.status(500).send("Internal server error");
    }
};

module.exports = { userAuth, adminAuth }
const User = require("../models/userSchema");

const setUser = async (req, res, next) => {
    try {
        // Only set user if user session exists and no admin session
        // This prevents admin from accessing user-specific views/data
        if (req.session.user && !req.session.admin) {
            const user = await User.findById(req.session.user);
            // Only set user if they're not an admin (double check)
            if (user && !user.isAdmin) {
                res.locals.user = user; // Make user available in all views
            } else {
                res.locals.user = null;
            }
        } else {
            res.locals.user = null; // Ensure user is null for non-logged-in users or admins
        }
        next();
    } catch (error) {
        console.error("Error in setUser middleware:", error);
        res.locals.user = null;
        next();
    }
};

module.exports = setUser;
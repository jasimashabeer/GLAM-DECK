
const preserveSessions = (req, res, next) => {
 
    const adminSession = req.session.admin;
    const userSession = req.session.user;
    const userIdSession = req.session.userId;

    // Store original values in request object for later restoration
    req._originalAdminSession = adminSession;
    req._originalUserSession = userSession;
    req._originalUserIdSession = userIdSession;

    // Hook into express-session's save mechanism by intercepting response finish
    // Express-session saves automatically, but we can ensure properties are preserved
    const originalEnd = res.end;
    res.end = function(...args) {
        // Before response ends, ensure both sessions are still present
        // This runs before express-session's final save
        
        // Preserve admin session independently - only restore if it was present and not intentionally cleared
        if (adminSession !== undefined && adminSession !== null) {
            // Check if this is an admin login/logout route where clearing is intentional
            const isAdminAuthRoute = req.path.includes('/admin/login') || req.path.includes('/admin/logout');
            // Only restore if it was cleared unintentionally (not on auth routes)
            if (!isAdminAuthRoute && (req.session.admin === undefined || req.session.admin === null)) {
                req.session.admin = adminSession;
            }
        }
        
        // Preserve user session independently - only restore if it was present and not intentionally cleared
        if (userSession !== undefined && userSession !== null) {
            // Check if this is a user login/logout route where clearing is intentional
            // Exclude admin routes from this check
            const isUserAuthRoute = (req.path.includes('/login') || req.path.includes('/logout')) && 
                                   !req.path.includes('/admin');
            // Only restore if it was cleared unintentionally (not on auth routes)
            if (!isUserAuthRoute && (req.session.user === undefined || req.session.user === null)) {
                req.session.user = userSession;
                if (userIdSession) {
                    req.session.userId = userIdSession;
                }
            }
        }
        
        return originalEnd.apply(this, args);
    };

    next();
};

module.exports = preserveSessions;
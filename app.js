const express = require('express')
const app = express()
const path = require('path')
const env = require('dotenv').config()
const db = require('./config/db')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const session = require('express-session')
const passport = require('./config/passport')
const setUser = require("./middlewares/setUserMiddleware")
const preserveSessions = require("./middlewares/preserveSession")

db()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false - only save sessions that have been modified
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}))


// Serve static files with caching BEFORE global no-cache middleware
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y', // Cache static assets for 1 year
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // HTML files shouldn't be cached as aggressively if they change
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));


app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');  // prevents browser cache for dynamic routes
    next();
});

app.use(passport.initialize())
app.use(passport.session())

// Preserve sessions middleware - must be after session middleware but before routes
app.use(preserveSessions)

app.set("view engine", "ejs")
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])


//app.use('/',userRouter)
app.use("/", setUser, userRouter)
app.use('/admin', adminRouter)

app.listen(process.env.PORT, () => {
    console.log('Server Running...')
})


module.exports = app
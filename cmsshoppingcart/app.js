var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/pages');
var adminRouter = require('./routes/admin_pages');
var categoriesRouter = require('./routes/admin_categories');
var usersRouter = require('./routes/users');
var adminProducts = require('./routes/admin_products');
var fileUpload = require('express-fileupload');
var products = require('./routes/products.js');
var cart = require('./routes/cart');
var users = require('./routes/users.js');
var passport = require('passport');


// Session
var session = require('express-session');
var expressSession = require('express-session')
var MongoStore = require('connect-mongo')
// Validator
const { body, validationResult } = require('express-validator');
var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



// App local
app.locals.errors = null;

// Express fileUpload middleware
app.use(fileUpload());

// Get Page Model
var Page = require('./models/page');
// Get all pages to pass to header.ejs
Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
    if (err) {
        console.log(err);
    } else {
        app.locals.pages = pages;
    }
});

// Get Category Model
var Category = require('./models/category');

// Get all categories to pass to header.ejs
Category.find(function (err, categories) {
    if (err) {
        console.log(err);
    } else {
        app.locals.categories = categories;
    }
}); 

// Express-session
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}))

// Errors
app.post(
  '/user',
  // username must be an email
  body('username').isEmail(),
  // password must be at least 5 chars long
  body('password').isLength({ min: 5 }),
  (req, res) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    User.create({
      username: req.body.username,
      password: req.body.password,
    }).then(user => res.json(user));
  },
);

// Express Messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
// cart
app.get('*', function(req,res,next) {
  res.locals.cart = req.session.cart;
  res.locals.user = req.user || null;
  next();
});

// set router
// các route phía admin "hiển thị"
app.use('/', indexRouter);  
app.use('/admin/pages', adminRouter);  
app.use('/admin/categories', categoriesRouter);
app.use('/admin/products', adminProducts);
app.use('/users', usersRouter);
app.use('/products', products);
app.use('/cart', cart);
app.use('/users', users);

// app.use('/products',require('./routes/products'));


// hiển thị phía client
app.use("/products",require("./routes/products"));
app.use('/pages', require('./routes/pages'))
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

//đăng nhập mới cho sửa bài viết
app.use(expressSession({
  secret: 'secret',
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/csmcart' }),
  resave: true,
  saveUninitialized: true
}))
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const config = require("./config/database");

// kết nối đến database.
const mongoose = require ("mongoose");
mongoose.connect(config.database, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Kết nối thành công");
});

module.exports = app;

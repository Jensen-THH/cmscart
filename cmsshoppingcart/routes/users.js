var express = require('express');
var router = express.Router();
var passport = require('passport');
var bcrypt = require('bcryptjs');
var bcrypt2 = require('bcrypt');

var User = require('../models/user');

const { check, validationResult } = require('express-validator');

// user login
// var bcrypt = require('bcrypt');
router.get('*', function (req, res, next) {
  res.locals.userId = req.session.userId;
  next()
})
/* GET register */
router.get('/register', function (req, res, next) {
  res.render('register', {
    title: 'Register'
  });
});

/* POST register */
const checkFormRegister = [
  check('name', 'Name is required!').notEmpty(),
  check('email', 'Email is required!').isEmail(),
  check('username', 'Username is required!').notEmpty(),
  check('password', 'Password is required!').notEmpty(),
  check('password2').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password do not match!');
    }
    return true;
  })
]
router.post('/register', checkFormRegister, function (req, res, next) {
  var name = req.body.name;
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  const errors = validationResult(req).errors;
  if (errors.length != 0) {
    res.render('register', {
      errors: errors,
      user: null,
      title: 'Register'
    });
  } else {
    User.findOne({ username: username }, function (err, user) {
      if (err) {
        console.log(err);
      }
      if (user) {
        req.flash('danger', 'Username exists, choose another!');
        res.redirect('/users/register');
      } else {
        var user = new User({
          name: name,
          email: email,
          username: username,
          password: password,
          admin: 1
        });
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) {
              console.log(err);
            }
            user.password = hash;
            user.save(function (err) {
              if (err) {
                console.log(err);
              } else {
                req.flash('success', 'You are now registered!');
                res.redirect('/users/login');
              }
            });
          });
        });
      }
    });
  }
});

/* GET login */
router.get('/login', function (req, res, next) {
  if (res.locals.user) res.redirect('/');
  res.render('login', {
    title: 'Log in'
  });
});

/* POST login */
router.post('/login', function (req, res, next) {
  var { nameUser, passwordUser } = req.body;
  console.log("chuan bi tim ... ")
  User.findOne({ username: nameUser }, (error, useradmin) => {
    console.log("dang tim...")
    if (useradmin) {
      bcrypt2.compare(passwordUser, useradmin.password, (error, same) => {
        if (same) {
          req.session.userId = useradmin._id
          res.redirect('/admin')
          console.log("log in ")
        }
       
      })
    }
  })
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

/* GET logout */
router.get('/logout', function (req, res, next) {
  req.logout();
  req.flash('success', 'You are logged out!');
  res.redirect('/users/login');
});
module.exports = router;


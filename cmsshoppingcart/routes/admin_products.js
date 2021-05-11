var express = require('express');
var router = express.Router();
var mkdirp = require('mkdirp');
var fs = require('fs-extra');
var resizeImg = require('resize-img');
var { check, validationResult } = require('express-validator');
var path = require('path')
var auth = require('../config/auth')
var isAdmin = auth.isAdmin;

// Get Product model
var Product = require('../models/product');

// Get Category model
var Category = require('../models/category');
const { compile } = require('ejs');

/*
 * GET products index
 */
router.get('/',isAdmin, function (req, res) {
  var count;

  Product.count(function (err, c) {
    count = c;
  });

  Product.find(function (err, products) {
    res.render('admin/products', {
      products: products,
      count: count
    });
  });
});


/* GET add product. */
router.get('/add-product', function (req, res, next) {
  var title = "";
  var desc = "";
  var price = "";

  Category.find(function (err, categories) {
    res.render('admin/add_product', {
      title: title,
      desc: desc,
      categories: categories,
      price: price
    });
  });
});

/* GET edit page. */
router.get('/edit-page/:slug', function (req, res, next) {
  Page.findOne({ slug: req.params.slug }, function (err, page) {
    if (err)
      return console.log(err);
    res.render('admin/edit_page', {
      title: page.title,
      slug: page.slug,
      content: page.content,
      id: page._id
    });
  });

});

function isImage(value, { req }) {
  var filename = req.files !== null ? req.files.image.name : '';
  var extension = (path.extname(filename)).toLowerCase();
  switch (extension) {
    case '.jpg': return '.jpg';
    case '.jpeg': return '.jpeg';
    case '.jng': return '.jng';
    case '': return '.jpg';
    default: return false;
  }
}

const isValidator = [
  check('title', 'Title must have a value.').notEmpty(),
  check('desc', 'Description must have a value.').notEmpty(),
  check('price', 'Price must have a value.').isDecimal(),
  check('image', 'You must have an image.').custom(isImage),
];
/* Post add product */
router.post("/add-product", isValidator,
  function (req, res, next) {
    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;
    var image = req.files !== null ? req.files.image.name : '';

    const errors = validationResult(req).errors;

    if (errors.length != 0) {
      Category.find(function (err, categories) {
        res.render('admin/add_product', {
          errors: errors,
          title: title,
          desc: desc,
          categories: categories,
          price: price
        });
      })
    }
    else {
      Product.findOne({ slug: slug }, function (err, product) {
        if (product) {
          req.flash('danger', 'Product title exists, choose another.');

          Category.find(function (err, categories) {
            res.render('admin/add_product', { title, desc, categories, price });
          });
        } else {
          var price2 = parseFloat(price).toFixed(2);
          var product = new Product({
            title: title,
            slug: slug,
            desc: desc,
            category: category,
            price: price2,
            image: image
          });
          product.save(function (err) {
            if (err)
              return console.log(err);
            var mypath = 'public/product_images/' + product._id;

            mkdirp.sync(mypath + '/gallery/thumbs');
            if (image != "") {
              var productImage = req.files.image;
              var tmp = mypath + '/' + image;
              productImage.mv(tmp, function (err) {
                if (err)
                  return console.log(err);
              });
            }
            req.flash('Success', 'Product added!');
            res.redirect('/admin/products');
          });
        }
      });
    }
  });
/*Get EDIT */
router.get('/edit-product/:id', function (req, res) {

  var errors;

  if (req.session.errors)
    errors = req.session.errors;
  req.session.errors = null;

  Category.find(function (err, categories) {

    Product.findById(req.params.id, function (err, p) {
      if (err) {
        console.log(err);
        res.redirect('/admin/products');
      } else {
        var galleryDir = 'public/product_images/' + p._id + '/gallery';
        var galleryImages = null;

        fs.readdir(galleryDir, function (err, files) {
          if (err) {
            console.log(err);
          } else {
            galleryImages = files;

            res.render('admin/edit_product', {
              title: p.title,
              errors: errors,
              desc: p.desc,
              categories: categories,
              category: p.category.replace(/\s+/g, '-').toLowerCase(),
              price: parseFloat(p.price).toFixed(2),
              images: p.images,
              galleryImages: galleryImages,
              id: p._id
            });
          }
        });
      }
    });

  });

});
/* GET POST Edit Product  . */
router.post("/edit-product/:id", isValidator,
  function (req, res, next) {
    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;
    var pimage = req.body.pimage;
    var id = req.params.id;
    var imageFile = req.files !== null ? req.files.image.name : '';

    const errors = validationResult(req).errors;

    if (errors.length != 0) {
      req.session.errors = errors;
      req.redirect('/admin/products/edit-product/' + id);
    } else {
      Product.findOne({ slug: slug, _id: { '$ne': id } }, function (err, p) {
        if (err)
          console.log(err)
        if (p) {
          req.flash('danger', 'Product title exists, choose another.');
          req.redirect('/admin/products/edit-product' + id);
        } else {
          Product.findById(id, function (err, p) {
            if (err)
              console.log(err);
            p.title = title;
            p.slug = slug;
            p.desc = desc;
            p.price = parseFloat(price).toFixed(2);
            p.category = category;

            if (imageFile != '') { p.image = imageFile; }

            p.save(function (err) {
              if (err) console.log(err);
              if (imageFile != '') {
                if (pimage != '') {
                  // xoá ảnh củ nếu có , và cập nhật ảnh mới
                  fs.remove('public/product_images/' + id + '/' + pimage,
                    function (err) { if (err) console.log(err); });
                }

                var productImage = req.files.image;
                var tmp = 'public/product_images/' + id + '/' + imageFile;
                productImage.mv(tmp, function (err) {
                  if (err)
                    return console.log(err);
                });
              }
              req.flash('Success', 'Product updated !');
              res.redirect('/admin/products/edit-product/' + id);
            });
          });
        }
      });
    }
  }
);
/*
 * POST product gallery
 */
router.post('/product-gallery/:id', function (req, res) {

  var productImage = req.files.file;
  var id = req.params.id;
  var path = 'public/product_images/' + id + '/gallery/' + req.files.file.name;
  var thumbsPath = 'public/product_images/' + id + '/gallery/thumbs/' + req.files.file.name;

  productImage.mv(path, function (err) {
    if (err)
      console.log(err);

    resizeImg(fs.readFileSync(path), { width: 100, height: 100 }).then(function (buf) {
      fs.writeFileSync(thumbsPath, buf);
    });
  });

  res.sendStatus(200);

});

/*
* GET delete image
*/
router.get('/delete-image/:image', function (req, res) {

  var originalImage = 'public/product_images/' + req.query.id + '/gallery/' + req.params.image;
  var thumbImage = 'public/product_images/' + req.query.id + '/gallery/thumbs/' + req.params.image;

  fs.remove(originalImage, function (err) {
    if (err) {
      console.log(err);
    } else {
      fs.remove(thumbImage, function (err) {
        if (err) {
          console.log(err);
        } else {
          req.flash('success', 'Image deleted!');
          res.redirect('/admin/products/edit-product/' + req.query.id);
        }
      });
    }
  });
});

/*
* GET delete product
*/
router.get('/delete-product/:id', function (req, res) {

  var id = req.params.id;
  var path = 'public/product_images/' + id;

  fs.remove(path, function (err) {
    if (err) {
      console.log(err);
    } else {
      Product.findByIdAndRemove(id, function (err) {
        console.log(err);
      });

      req.flash('success', 'Product deleted!');
      res.redirect('/admin/products');
    }
  });

});

// Exports
module.exports = router;
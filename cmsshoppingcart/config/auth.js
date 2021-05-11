exports.isUser = function (req,res,next){
    if(req.res.isAuthenticated()){
        next()
    }
    else{
        req.flash('danger','please login');
        req.redirect('/users/login');
    }
}
exports.isAdmin =  function (req,res,next) { 
    if(req.isAuthenticated() && res.locals.user.admin){
        next();
    }
    else{
        req.flash('danger','please login as admin');
        res.redirect('/users/login');
    }
 }
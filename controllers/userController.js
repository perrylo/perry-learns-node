const mongoose = require('mongoose');
const User = mongoose.model('User'); // Get User Model
const promisify = require('es6-promisify');

exports.registerForm = (reg, res) => {
  res.render('register', { title:'Register' });
};

exports.loginForm = (req, res) => {
  res.render('login', { title:'Login' });
};

// validation middleware
exports.validateRegister = (req, res, next) => {
  // these method are coming from expressValidator that was included to app.js
  // https://github.com/ctavan/express-validator
  req.sanitizeBody('name'); 
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'You must supply an email!').notEmpty();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match!').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    /* 
      we don't call next to use other middleware to handle errors here, 
      instead we want to handle(display) them ourselves directly
    */
    req.flash('error', errors.map(err => err.msg));
    /*
      we render this same page but pass body so that all the fields that user has filled in remain (don't annoy user by refressing)
      and pass the flashes so that error messages will be displayed
    */
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // stop the registration process
  }
  next(); // there were no errors, pass to userController.register
}; 

// register new user
exports.register = async (req, res, next) => {
  const user = new User({
    email: req.body.email,
    name: req.body.name
  });

  /* 
  .register method of User of our model was given to us by passportLocalMongoose plugin
  We won't user this because register method doesn't use promises instead using a callback as below, 
  so we'll use promisify
  
  User.register(user, req.body.password, function(err, user){

  }); 
  */
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next(); // pass to authController.login
};



exports.account = (req, res) => {
  res.render('account', { title: 'Edit your Account'});
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );
  req.flash('success', 'Account successfully updated!');
  res.redirect('back'); // 'back' just sends user back to url they originally came from, which is the same as '/account'
};
const passport = require('passport');
const crypto = require('crypto');  // This package is built into Node, no need to install
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out.')
  res.redirect('/');
};

// Middleware to check logged in state of user (to allow access to parts of site)
exports.isLoggedIn = (req, res, next) => {
  // 1. check if user is authenticated
  if (req.isAuthenticated()){
    next(); // carry on! They are logged in
    return;
  }
  req.flash('error', 'Oops user must be logged in to do that!');
  res.redirect('/login');
};

// Reset password form handler
exports.forgot = async (req, res) => {
  //1. see if user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('success', 'A password reset has been mailed to that email.');
    res.redirect('/login');
    return;
  }

  // 2. set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now, in milliseconds
  await user.save();

  // 3. send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user, 
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });
  req.flash('success', `You have been emailed a password link.`);

  // 4.redirect to login page 
  res.redirect('/login');
};

// Reset password link handler
exports.reset = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // Special mongo db query where we want to match a value (saved in DB) that is greater than now
  });

  if(!user){
    req.flash('error', 'Password token is invalid or expired.');
    res.redirect('/login');
    return;
  }

  // if there is a user, show the reset password form
  res.render('reset', { title: 'Reset Your Password' });
}

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']){
    next(); // password and re-typed password match, all good keep going
    return;
  }
  req.flash('error', 'Passwords do no match!');
  res.redirect('back');
}

exports.update = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // Special mongo db query where we want to match a value (saved in DB) that is greater than now
  });

  // recheck token is still valid as user may have just opened screen and did nothing for a while
  if(!user){
    req.flash('error', 'Password token is invalid or expired.');
    res.redirect('/login');
    return;
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined; //unset this in db
  user.resetPasswordExpires = undefined; //unset this in db
  const updatedUser = await user.save(); // save the changes to user
  await req.login(updatedUser); // auto-login user
  req.flash('success', 'Your password has been reset!');
  res.redirect('/');

}
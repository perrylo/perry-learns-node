const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

// configure passport with the strategy we want to use (in this case 'local')
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
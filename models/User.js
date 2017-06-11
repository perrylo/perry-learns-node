const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; // Shouldn't have to do this but there is a bug in Mongoose, so we reference the Promise as defined in globals
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

// Main user schema
const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'], // [ validation rule, validation error message ]
    required: 'Please supply an email address'
  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [
    { 
      type: mongoose.Schema.ObjectId, 
      ref: 'Store' 
    }
  ]
});


// Gravitar - use a virtual field, that is a field that can be generated on the fly (ie if you got lb you can generate kg)
userSchema.virtual('gravatar').get(function(){
  // this === user
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});


// This takes our schema defined above and used Passportjs (package of Nodejs) to add on all other methods for authentication (http://passportjs.org/)
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

// This changes ugly errors to user-friendly readable error messages
userSchema.plugin(mongodbErrorHandler);

/*
We use module.exports instead of module.exports.something as this is the main thing we are exporting 
and we require this file this we don't need specify exactly what we are requiring
*/
module.exports = mongoose.model('User', userSchema);

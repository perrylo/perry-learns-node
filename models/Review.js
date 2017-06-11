const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'You must supply a store!'
  },
  text: {
    type: String,
    required: 'You must supply some review text!'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
});

function autopopulate(next) {
  this.populate('author');
  next();
}

// Add hooks to whenever 'find' or 'findOne' is called it will auto populate the author data as part of the review
reviewSchema.pre('find', autopopulate); 
reviewSchema.pre('findOne', autopopulate);


module.exports = mongoose.model('Review', reviewSchema);

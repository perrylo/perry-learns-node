const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type:     String,
    trim:     true, // Wes' rule of thumb, do as much data normalization as close to Model as possible
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type:     String,
    trim:     true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number, 
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String, 
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId, // This is how use foreign keys in MongoDB
    ref: 'User', //references User.js model
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true }, // this will force virtuals to populate in the data regardless if you explicitly use (see line 95 note)
  toObject: { virtuals: true }
});

// Define our indexes
// - Tell MongoDB what fields to index (that you'll likely be searching on often) and how to index them
// - This will allow us to search both of these fields in one go
storeSchema.index({
  name: 'text',
  description: 'text'
});

// - store metadata of location as geo-spatial data
storeSchema.index({ location: '2dsphere' });

// Perry's assignment: add a libray to filter out html from fields!!!
storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')){
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);

  // find other stores that have the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug:slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();
  // todo make more resiliant so slugs are unique
});


// custom defining a static method on model
storeSchema.statics.getTagsList = function() {
  // aggregate is another method provided by mongoose like find or findById or findOne, returns a Promise so that we can await
  // see: https://docs.mongodb.com/manual/reference/operator/aggregation/
  return this.aggregate([ 
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]); 
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup Stores and populate their reviews
    { $lookup: {
      from: 'reviews', // MongoDB is auto-making 'reviews', by lower-casing 'Review' and adding an s to the end... what?
      localField: '_id', 
      foreignField: 'store', 
      as: 'reviews' // so the node of reviews in the json will be named 'reviews'
    }}, 
    // Filter for only items that have 2 or more reivews
    { $match: {
      'reviews.1': { $exists: true } // This is how you access things by index in MongoDB... essentially make sure there is a review at index 1 meaning also that there must be something at index 0 - voila, at least 2 reviews
    }},
    // Add the average reviews field
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        slug: '$$ROOT.slug',
        reviews: '$$ROOT.reviews',
        averageRating: { $avg: '$reviews.rating' }
    }},
    // Sort it by our new field, highest reviews rist
    {
      $sort: {
        averageRating: -1
    }},
    // Limit to at most 10
    {
      $limit: 10
    }
  ]);
}


// find reviews where the stores._id property === reviews.stores property
// (essentially a join)
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the store
  foreignField: 'store' // which field on the review
});
/*
GOTCHA: Virtual fields don't go into the object unless you explictly as for the data,
(see storeController:126 where we a populating the author and reviews).  Unless you use store.reviews you will not 
see this data in just a dump of store.
*/


function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);
 
module.exports = mongoose.model('Store', storeSchema); // use module.exports if the 'main thing' of this code is the export

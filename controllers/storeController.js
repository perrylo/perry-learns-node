const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next){
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
      // node callback structure: 
      // if you call next and pass something as first arg, that tells node that there is an error
      // if you call next and pass null as first arg, that tells node that operation is successful and it should pass second arg as value
      } else {
        next({ message: 'That filetype isn\'t allowed!'}, false);
      }
  }
};

/* middleware example, vid 08
exports.myMiddleware = (req, res, next) => {
  req.name = 'Perry';
  next();
};
*/

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store'
  });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  // multer puts the actual file to req.file
  if (!req.file){
    next(); //skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`; //uuid (a node package) generates unique ids

  // new we resize
  const photo = await jimp.read(req.file.buffer); // jimp (another node package) is used for image manipulation
  await photo.resize(800, jimp.AUTO); // tells jimp to resize to w x h: 800 x auto (keep proportions)
  await photo.write(`./public/uploads/${req.body.photo}`);

  // once we have writting the photo to our filsystem, keep going
  next();
};

// With async/await you catch error using a try/catch statement around the body containing await, but that maybe ugly.  
// Instead, use composition, wrap this function inside a middleware errorHandlers.js > catchErrors
exports.createStore = async (req, res) => {
  req.body.author = req.user._id; // remember that the req.user is global and was defined in app.js

  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name}.  Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;

  // 1. Query the database for a list of all stores
  const storesPromise = Store
    .find()
    .skip(skip) // pagination
    .limit(limit) // pagination
    .sort({ created: 'desc' })
    //.populate('reviews'); // No longer need to do this here because the Store model will autopopulate (see line 137)
  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  const numberOfPages = Math.ceil(count / limit);

  // Sanity check for pages that have no content, ie page index is beyond the number of stores
  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}.  But that doesn't exist so I put you on page ${numberOfPages}.`);
    res.redirect(`/stores/page/${numberOfPages}`);
    return;
  }

  res.render('stores', { title: 'Stores', stores, page, numberOfPages, count });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store by Id
  const store = await Store.findOne({ _id: req.params.id });
  
  // 2. confirm user is owner of store
  //confirmOwner(store, req.user);
  if (!store.author.equals(req.user._id)) {
    req.flash('error', 'You must own a store in order to edit it!');
    res.redirect('/');
    return;
  }
  
  // 3. Render edit form so user can update store
  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';

  // 1. find and update a store
  // see mongoose api docs:http://mongoosejs.com/docs/api.html
  // findOneAndUpdate takes arguments (query, data, options)
  const store = await Store.findOneAndUpdate({ _id: req.params.storeIdToEdit }, req.body, {
    new: true, // return the new store instead of the old one
    runValidators: true // force model (see Store.js) to run required validators
  }).exec(); // mongoose runs query as a promise http://mongoosejs.com/docs/promises.html

  // 2. redirect user to the store and tell them it worked
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store >></a>`);
  res.redirect(`/stores/${store._id}/edit`);
};


exports.getStoreBySlug = async (req, res, next) => {
  /*
    .populate('author') will inject the referenced object along with the regular set of data, 
    as author was added to Store model as an ObjectId. 

    You shouldn't do this in practice as it exposes all the users info, including password
  */
  //const store = await Store.findOne({ slug:req.params.slug }).populate('author'); 
  const store = await Store.findOne({ slug:req.params.slug }).populate('author reviews'); 
  
  if (!store){
    next();
    return;
  }

  res.render('store', { store, title:store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  /* 
    We use promises here instead of await because await causes synchronous behavour: each
    await must complete before the next one begins.  But, getting a list of tags and getting a list of stores
    are independent so we should do them both at the same time asynchronously, but wait for both at the same time
  */
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tag || { $exists: true } }); // query for a tag (if given) or for any existance of a tag
  const [ tags, stores ] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tags', { tags, title: 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
  //res.json(req.query); Outputs the query parameters of the request

  const stores = await Store
  // first find stores that match
  .find({
    $text: { // Special MongoDB query type (by text)
      $search: req.query.q
    } 
  }, {
    score: { $meta: 'textScore' } //project (add a field) to the search results
  })
  // then sort them
  .sort({
    score: { $meta: 'textScore' } // sort by the project field
  })
  // limit them to 5 results
  .limit(5);
  ;
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: { 
      $near:{
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000// in meters (10 km)
      }
    }
  }

  // Given the Store model pass it the MongoDB query, 
  // and chain a select to get only the data we want,
  // and limit to 10 results
  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  //const stores = await Store.find(q).select('-author -tags'); This will give everything but author and tags
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', {title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  /* 
    if the user's hearts array from DB contains this store id then remove it, 
    otherwise add uniquely (addToSet makes sure value only occurs once)
  */
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user.id,
      // use ES6 computed keys!!!
      { [operator]: { hearts: req.params.id }},
      { new: true }
    );

  res.json(user)
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title: 'Hearted Stores', stores});
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title:'Top Stores!' } );
}

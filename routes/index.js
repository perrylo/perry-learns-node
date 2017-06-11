const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// This is our routes file, which will only contain our possible routes and then which controller.function a route should send to

//router.get('/', storeController.myMiddleware, storeController.homePage); // Middleware example, vid 08

//router.get('/', storeController.homepage); 

// Homepage and Store List page
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));

// CRUD Stores
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post('/add', 
  storeController.upload,
  catchErrors(storeController.resize), 
  catchErrors(storeController.createStore)
);
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.post('/add/:storeIdToEdit', 
  storeController.upload,
  catchErrors(storeController.resize), 
  catchErrors(storeController.updateStore)
);

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));


// Get stores by Tag
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));


// CRUD Users
router.get('/register', userController.registerForm);
/*
  1. Validate the registration data 
  2. Register the user
  3. Log them in
*/
router.post('/register',  
  userController.validateRegister,
  userController.register,
  authController.login
  );
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', 
  authController.confirmedPasswords, 
  catchErrors(authController.update)
);


// Map
router.get('/map', storeController.mapPage);


// Login/logout
router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));


// Reviews
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

// Top stores
router.get('/top', catchErrors(storeController.getTopStores));



// API endpoints
router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

/* Learning basic express router functions and passing data
router.get('/', (req, res) => {
  const west = { name: 'Wes', age: 100, cool: true };
  // Gotcha: make sure you don't send data more than once, you'll get error 'Headers already sent'
  //res.send('Hey! It works!');
  //res.json(west);
  //res.send(req.query.name); // getting data from url parameter 'name'
  //res.json(req.query);
  
  res.render('testingPug', {
    name: 'perry',
    dog: req.query.dogname
  });
  res.render('hello', {
    title: 'I love food'
  });
});
*/

// Example router to show how to capture uri parts as variables, in this case everything after reverse to be called 'name'
/*
router.get('/reverse/:name', (req, res) => {
  const reverse = [...req.params.name].reverse().join('');
  res.send(reverse);
});
*/

module.exports = router;

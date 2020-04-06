var express = require('express');
var router = express.Router();
var usersController = require('../controllers/index');

/* GET home page. */
router.post('/signup', usersController.signup);
router.post('/login', usersController.login);

module.exports = router;

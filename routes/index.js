var express = require('express');
var router = express.Router();
var indexController = require('../controllers/index');

/* GET home page. */
router.post('/signup', indexController.signup);
router.post('/login', indexController.login);

module.exports = router;

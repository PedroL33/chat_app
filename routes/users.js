var express = require('express');
var router = express.Router();
var checkAuth = require('../Middlewear/checkAuth')

/* GET users listing. */
router.get('/', checkAuth, function(req, res, next) {
  res.json({msg: "welcome"})
});



module.exports = router;

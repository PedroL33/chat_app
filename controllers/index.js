var { check, validationResult } = require('express-validator');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const User = require('../models/users');
require('dotenv').config();

exports.signup = [
    check('username').isLength({min: 4}).withMessage("Must be at least 4 characters long."),
    check('password').isLength({min:6}).withMessage("Must be at least 6 characters long."),

    async (req, res) => {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(422).json({
                errors: errors.array()
            })
        }
        const exists = await User.findOne({username: req.body.username});
        if(exists) {
          return res.status(400).json({
            erorrs: [{param: "username", msg: "Already exists."}]
          })
        }else {
          const passhash = await bcrypt.hash(req.body.password, 12)
          const user = new User({
            username: req.body.username,
            password: passhash
          })
          const saved = await user.save()
          return res.status(200).json({
              msg: "User successfully created.",
              token: jwt.sign({username: saved.username, id: saved._id}, process.env.JWTSECRET, {expiresIn: '1h'})
          })
        }
    }
]

exports.login = async (req, res) => {
    const user = await User.findOne({username: req.body.username})
    if(!user) {
      return res.status(422).json({
        error: "Invalid Credentials"
      })
    }
    const match = await bcrypt.compare(req.body.password, user.password)
    if(!match) {
      return res.status(422).json({
        error: "Invalid Credentials"
      })
    }
    return res.status(200).json({
        msg: "Authentication successful.",
        token: jwt.sign({username: user.username, id: user._id}, process.env.JWTSECRET, {expiresIn: '1h'})
    })
}
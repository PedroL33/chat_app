var { check, validationResult } = require('express-validator');
var bcrypt = require('bcrypt');
var User = require('../models/users');
var jwt = require('jsonwebtoken');
require('dotenv').config();

exports.signup = [
    check('username').isLength({min: 4}).withMessage("Must be at least 4 characters long."),
    check('email').isEmail().withMessage("Invalid email."),
    check('password').isLength({min:6}).withMessage("Must be at least 6 characters long."),

    (req, res) => {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(422).json({
                error: errors.array()
            })
        }
        bcrypt.hash(req.body.password, 12, function(err, hash) {
            if(err && err.length) {
                return res.status(400).json({
                    error: err
                })
            }
            console.log(hash)
            var user = new User({
                username: req.body.username,
                password: hash,
                email: req.body.email,
                friends: []
            })
            user.save(function(err) {
                if(err) {
                    if(err.name === 'MongoError' && err.code === 11000) {
                        return res.status(400).json({
                            error: "Username already taken."
                        })
                    }else {
                        return res.status(500).json({
                            error: "Could not create user."
                        })
                    }
                }else {
                    res.status(200).json({
                        msg: "User successfully created.",
                        token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
                    })
                }
            })
        })
    }
]

exports.login = (req, res) => {
    User.find({'username': req.body.username})
    .exec()
    .then(user => {
        bcrypt.compare(req.body.password, user[0].password, function(err, result) {
            if(!result) {
                return res.status(422).json({
                    error: "Invalid Credentials"
                })
            }else {
                return res.status(200).json({
                    msg: "Authentication successful.",
                    token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
                })
            }
        })
    })
    .catch(error => {
        return res.status(400).json({
            error: "Invalid Credentials"
        })
    })
}
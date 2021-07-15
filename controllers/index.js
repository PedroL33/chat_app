var { check, validationResult } = require('express-validator');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
require('dotenv').config();

const neo4j = require('neo4j-driver');
const driver = neo4j.driver(process.env.AURA_URI, neo4j.auth.basic(process.env.AURA_USER, process.env.AURA_PASSWORD));


exports.onlineUsers = {};

exports.signup = [
    check('username').isLength({min: 4}).withMessage("Must be at least 4 characters long."),
    check('password').isLength({min:6}).withMessage("Must be at least 6 characters long."),
    check('email').isEmail().withMessage("Invalid email."),

    (req, res) => {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(422).json({
                errors: errors.array()
            })
        }
        bcrypt.hash(req.body.password, 12, async (err, hash) => {
            if(err && err.length) {
                return res.status(400).json({
                    errors: err
                })
            }
            const session = driver.session();
            try {
              await session.writeTransaction(tx => {
                tx.run(`CREATE (u:user{username: '${req.body.username}', password: '${hash}', email: '${req.body.email}', status: "chatting", picture: "https://chatbucket11.s3-us-west-2.amazonaws.com/bucketFolder/1589250752087-lg.png"}) RETURN u`)
              })
              return res.status(200).json({
                  msg: "User successfully created.",
                  token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
              })
            }catch(err) {
              if(err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
                  return res.status(400).json({
                      errors: [{param: "username", msg: "Username or email already in use."}, {param: "email", msg: "Username or email already in use."}]
                  })
              }else {
                  return res.status(400).json({
                      errors: [{param: "body", msg:  'Something went wrong.'}]
                  })
              }
            }finally {
              await session.close();
            }
        })
    }
]

exports.login = async (req, res) => {
    const session = driver.session();
    try {
      const results = await session.readTransaction(tx => 
        tx.run(`MATCH (u:user {username: $username}) RETURN u`, {username: req.body.username})
      )
      if(results.records && results.records[0]) {
        bcrypt.compare(req.body.password, results.records[0]._fields[0].properties.password, (err, valid) => {
          if(valid) {
            if(module.exports.onlineUsers[req.body.username]) {
              return res.status(400).json({
                error: "Already logged in somewhere."
              })
            }else {
              return res.status(200).json({
                  msg: "Authentication successful.",
                  token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
              })
            }
          }else {
              return res.status(400).json({
                  error: "Invalid Credentials"
              })
          }
        })
      }else {
        return res.status(400).json({
          error: "Invalid Credentials"
        })
      }
    }catch(err) {
      return res.status(400).json({
          error: "Server error"
      })
    }finally {
        await session.close();
    }
}
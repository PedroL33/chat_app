var { check, validationResult } = require('express-validator');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
require('dotenv').config();

const neo4j = require('neo4j-driver');
var driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD), { encrypted : true });
var session = driver.session();

//Constraints
//CREATE CONSTRAINT ON (n: user) ASSERT n.username IS UNIQUE
//CREATE CONSTRAINT ON (n: user) ASSERT n.email IS UNIQUE

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
        bcrypt.hash(req.body.password, 12, function(err, hash) {
            if(err && err.length) {
                return res.status(400).json({
                    errors: err
                })
            }
            session.run(`CREATE (user:user{username: '${req.body.username}', password: '${hash}', email: '${req.body.email}', status: "chatting", picture: "https://chatbucket11.s3-us-west-2.amazonaws.com/bucketFolder/1589250752087-lg.png"}) RETURN user`)
            .then(result => {
                return res.status(200).json({
                    msg: "User successfully created.",
                    token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
                })
            })
            .catch(err => {
                console.log(err.neo4jError)
                if(err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
                    return res.status(400).json({
                        errors: [{param: "username", msg: "Username or email already in use."}, {param: "email", msg: "Username or email already in use."}]
                    })
                }else {
                    console.log(err)
                    return res.status(400).json({
                        errors: [{param: "body", msg:  'Something went wrong.'}]
                    })
                }
            })
        })
    }
]

exports.login = (req, res) => {
    session.run(`MATCH (user:user{username: '${req.body.username}'}) RETURN user`)
    .then(result => {
        if(result.records[0]) {
            bcrypt.compare(req.body.password, result.records[0]._fields[0].properties.password, (err, results) => {
                if(results) {
                    return res.status(200).json({
                        msg: "Authentication successful.",
                        token: jwt.sign({username: req.body.username}, process.env.JWTSECRET, {expiresIn: '1h'})
                    })
                }else {
                    return res.status(400).json({
                        error: "Invalid Credentials"
                    })
                }
            })
        }else {
            return res.status(422).json({
                error: "Invalid Credentials"
            })
        }
    })
    .catch(error => {
        console.log(error)
    })
}
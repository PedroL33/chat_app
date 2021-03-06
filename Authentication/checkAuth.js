var jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports.authenticate = function (socket, next) {
    var query = socket.handshake.query
    if(query && query.token) {
        try{
            jwt.verify(query.token, process.env.JWTSECRET, function(err, decoded) {
                if(decoded.exp < Date.now()/1000) {
                    return next(new Error("Invalid token."))
                }else {
                    socket.username = decoded.username
                    next()
                }
            })
        }
        catch {
            return next(new Error("Invalid token."))
        }
    }
}

module.exports.checkAuth = (token, cb) => {
    try {
        jwt.verify(token, process.env.JWTSECRET, function(err, decoded) {
            if(decoded.exp < Date.now()/1000) {
                cb(false)
            }else {
                cb(true)
            }
        })
    }
    catch {
        cb(false);
    }
}
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

module.exports.checkAuth = async (socket) => {
  return new Promise((resolve, reject) => {
    try {
      if(!socket.handshake.query || !socket.handshake.query.token) {
        reject("Auth error")
      }
      jwt.verify(socket.handshake.query.token, process.env.JWTSECRET, function(err, decoded) {
          if(decoded.exp < Date.now()/1000) {
              reject("Auth error");
          }else {
            resolve(decoded)
          }
      })
    }
    catch {
        reject("Auth error");
    }
  })
}
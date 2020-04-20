var jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function checkAuth(req, res, next) {
    const token = req.headers.authorization.split(" ")[1]
    try {
        var decoded = jwt.verify(token, process.env.JWTSECRET)
        if(decoded.exp < (Date.now()/1000)) {
            return res.status(400).json({
                error: "Session expired."
            })
        }
        next();
    } catch(err) {
        return res.status(400).json({error: "Permission denied."})
    }
}
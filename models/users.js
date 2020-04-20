const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
    username: {type: String, unique: true, min: 4},
    password: {type: String, min: 5},
    email: {type: String, unique: true},
    requests: {type: Array},
    friends: {type: Array}
})

User.statics.emailExists = function(email) {
    return this.find({email: email}).then(user => {
        if(user.length) {
            return Promise.reject("Email already in use.")
        }
    })
}

User.statics.sendRequest = function(from, to) {
    return this.find({$or: [{username: to}, {username: from}]})
    .then( users => {
        if(from === to) {
            return {error: "Cannot add yourself."}
        }
        else if(users.length===1) {
            return {error: "User with that username does not exist."}
        }
        else if(users.length > 1) {
            const fromUser = users[0].username===from ? users[0] : users[1]
            const toUser = users[0].username===to ? users[0] : users[1]
            if(fromUser.requests.includes(to)) {
                return {error: "Request has already been sent"}
            }else if(toUser.requests.includes(from)) {
                return {error: "This user has added you. Check your requests."}
            }else if(toUser.friends.includes(fromUser)) {
                return {error: "This user is already your friend."}
            }else {
                toUser.requests.push(from)
                toUser.save()
                return {success: `Request sent to ${to}.`}
            }
        }
    })
}

User.statics.acceptRequest = function(user, request) {
    return this.find({username: user})
    .then(user => {
        if(user.length && user[0].requests.includes(request)) {
            const currentUser = user[0];
            currentUser.requests.splice(currentUser.requests.indexOf(request), 1)
            currentUser.friends.push(request)
            currentUser.save()
            return {success: `You are now friends with ${request}.`}
        }else {
            return {error: "Something went wrong."}
        }
    })
}

module.exports = mongoose.model('User', User);
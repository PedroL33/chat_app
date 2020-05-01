var Message = require('../models/messages');
var auth = require('../Authentication/checkAuth')

module.exports.getMessageData = function(socket, token) {
    auth.checkAuth(token, (res) => {
        if(res) {
            Message.find({$or: [{from: socket.username}, {to: socket.username}]})
            .exec((err, results) => {
                if(err) {
                    return console.log(err)
                }
                socket.emit("message_data", results)
            })
        }
        else {
            socket.emit('invalid_auth')
        }
    })
}

module.exports.createMessage = function(socket, onlineUsers, newMessage) {
    var message = new Message(newMessage)
    message.save((err, message) => {
        if(err) {
            return console.log(err)
        }
        socket.emit('message_update', newMessage.from)
        onlineUsers[newMessage.to].emit('message_update', newMessage.from)
    })
}
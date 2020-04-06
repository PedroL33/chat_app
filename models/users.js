const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Request = new Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    status: {type: String, required: true}
})

const User = new Schema({
    username: {type: String, unique: true, min: 4},
    password: {type: String, min: 5},
    email: {type: String},
    friends: [Request]
})

module.exports = mongoose.model('User', User);
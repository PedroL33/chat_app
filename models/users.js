const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {type: String},
  password: {type: String},
  image: {type: String, default: "https://chatbucket11.s3-us-west-2.amazonaws.com/bucketFolder/1589250752087-lg.png"},
  status: {type: String, default: "chatting"}
});

module.exports = mongoose.model("User", UserSchema);
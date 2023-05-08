const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  lastPasswordChangedDate: {
    type: Date,
    default: Date.now
  },
  date: {
    type: Date,
    default: Date.now
  },
  birthDate: {
    type: Date,
    default: null
  },
  theme: {
    type: String,
    default: 'light'
  },
  gender: {
    type: String,
    default: 'male'
  },
  profilePicture: {
    type: String,
  }
});

const User = mongoose.model('user', UserSchema);

module.exports = User;
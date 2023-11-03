const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },

  verified: {
    type: Boolean,
    default: false,
    required: true,
  },

  profilePic: {
    type: String,
  },

  isProfilePic: { type: Boolean, default: true },

  aflag: {
    type: Boolean,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
   isNotifySound: {
    type: Boolean,
    default: false,
  },
   notificationSound: {
    type: String,
  },
  attorneyStatus: {
    type: String,
  },
  appointmentStatus: {
    type: String,
  },
  lastModified: {
    type: Date,
    default: Date.now(),
  },
  admin:{
    type: Boolean,
    default: false,
  }
});
module.exports = mongoose.model("UserModel", userSchema);

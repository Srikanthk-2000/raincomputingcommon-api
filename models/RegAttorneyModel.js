const mongoose = require("mongoose");

const RegAttorneySchema = mongoose.Schema({
  regUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
  },
  registerNumber: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  firm: {
    type: String,
  },

  bio: {
    type: String,
  },
  address: {
    type: String,
  },
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  postalCode: {
    type: Number,
  },
  aflag: {
    type: Boolean,
  },
  regAt: {
    type: Date,
    default: Date.now(),
  },
  lastModified: {
    type: Date,
    default: Date.now(),
  },
  status: {
    type: String,
  },
  scheduleDates: [
    {
      type: Date,
    },
  ],
});

module.exports = mongoose.model("RegAttorney", RegAttorneySchema);

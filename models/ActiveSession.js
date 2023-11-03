const mongoose = require("mongoose");

const activeSessionSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  adminId: {
    type: String,
    required: true,
  },
  aflag: {
    type: Boolean,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("ActiveSessionModel", activeSessionSchema);

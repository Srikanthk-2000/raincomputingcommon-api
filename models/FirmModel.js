const mongoose = require("mongoose");

const FirmSchema = mongoose.Schema({
  attorneyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RegAttorney",
  },
  firmName: {
    type: String,
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegAttorney",
    },
  ],
  lastModified: {
    type: Date,
    default: Date.now(),
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  aflag: {
    type: Boolean,
  },
});

module.exports = mongoose.model("Firm", FirmSchema);

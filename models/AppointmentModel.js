const mongoose = require("mongoose");

const appointmentSchema = mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    attorney: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegAttorney",
    },
    caseData: {
      type: String,
    },
    isAttachments: {
      type: Boolean,
      default: false,
    },
    attachments: [],
    // appointmentRequest: {
    //   type: String,
    // },

    aflag: {
      type: Boolean,
      default: true,
    },
    appointmentstatus: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);

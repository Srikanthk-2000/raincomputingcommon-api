const mongoose = require("mongoose");

const caseSchema = mongoose.Schema(
  {
    caseName: {
      type: String,
      required: true,
    },
    caseId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
    },
    // serialNumber: {
    //   type: String,
    //   required: true,
    // },
    events: [
      {
        docEvent: {
          type: String,
        },
        eventText: [
          {
            text: { type: String },
            docDate: { type: Date },
          },
        ],
        receivedDate: {
          type: Date,
        },
        createdAt: { type: Date, default: new Date() },
        aflag: {
          type: Boolean,
          default: true,
        },
      },
    ],
    caseMembers: [
      {
        _id: false,
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserModel",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserModel",
        },
        addedAt: {
          type: Date,
          default: Date.now(),
        },
        lastModifiedAt: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
    notifyMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
    aflag: {
      type: Boolean,
      default: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isSubcase: {
      type: Boolean,
    },
    maincaseId: {
      type: String,
    },
    threadId: {
      type: String,
    },
    threadIdCondition: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);

const mongoose = require("mongoose");

const groupSchema = mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
    },
    groupName: {
      type: String,
      default: "Everyone",
    },
    groupMembers: [
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
    isParent: {
      type: Boolean,
      default: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
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
    color: {
      type: String,
      default: "#0000FF",
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

module.exports = mongoose.model("Group", groupSchema);

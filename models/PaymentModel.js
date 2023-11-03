const mongoose = require("mongoose");

const PaymentSchema = mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    attorneyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegAttorney",
    },
    payAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
    },
    transactionId: {
        type: String,
    },
    isRefund: {
        type: Boolean,
        default: false,
    },
    aflag: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);

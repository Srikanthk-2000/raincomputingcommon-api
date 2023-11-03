const mongoose = require("mongoose");

const intervalSchema = mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Case",
  },
 
  interval: {
    type: Number,
  },
  events: [
    { 
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventModel",
      },
      receivedDate: {
        type: Date,
      },
      eventName: {
        type: String,
      },
      intervals: [
        {
          _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: mongoose.Types.ObjectId,
          },
          responseText: { type: String },
          responseDate: { type: Date },
          isActive: {
            type: Boolean,
          },
          note: {
            type: [
              {
                notes: { type: String },
                userId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'UserModel',
                },
                createdAt: { type: Date, default: new Date() },
              },
            ],
            default: [],
          },
        },
      ],
    
      createdAt: { type: Date, default: new Date() },
      aflag: {
        type: Boolean,
        default: true,
      },
   
    },
  ],
});
module.exports = mongoose.model("Interval", intervalSchema);

const mongoose = require("mongoose");
const eventSchema = mongoose.Schema({
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RegAttorney",
  },
  eventName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  events:[{
    
     interval: {
      type: Number
     },
     scheduledType: {
      type: String
     },
     responseText :{
      type: String,
       },

  }],

  createdAt: { type: Date, default: new Date() },
  aflag: {
    type: Boolean,
  }
})
module.exports = mongoose.model("EventModel", eventSchema);
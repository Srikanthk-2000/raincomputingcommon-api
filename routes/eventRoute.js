const express = require("express");
const Eventmodel = require("../models/Eventmodel");
const router = express.Router();
router.get("/", (req, res) => res.send("event Route"));
router.post("/create", async (req, res) => {
  const { eventName, description, events ,firmId} = req.body;
  const eventData = {
    eventName: eventName,
    firmId: firmId,
    description: description,
    events: events.map((event) => ({
     scheduledType: event.scheduledType,
     responseText: event.responseText,
     interval: event.interval
    })),
    aflag: true,
  };
  Eventmodel.create(eventData, async (err, event) => {
    if (err) {
      return res.json({
        msg: "pls select event ",
        error: err,
      });
    } else {
      return res.json({
        success: true,
        msg: " event added",
        event,
      });
    }
  });
});
router.post("/eventUpdate", async (req, res) => {
  const {  events,eventId} = req.body;
  const eventData = {

    events: events.map((event) => ({
      _id: event._id,
      scheduledType: event.scheduledType,
      responseText: event.responseText,
      interval: event.interval,
    })),
    aflag: true,
  };
  
  Eventmodel.findByIdAndUpdate(eventId, eventData, { new: true }, (err, updatedEvent) => {
    if (err) {
      return res.json({
        msg: "Failed to update event",
        error: err,
      });
    } else {
      return res.json({
        success: true,
        msg: "Event updated successfully",
        event: updatedEvent,
      });
    }
  });
});


router.post("/getAllCaseEvent", async (req, res) => {
  const { id } = req.body;
  Eventmodel.find({ firmId: id }, (err, data) => {
    if (err) {
      return res.json({
        msg: "Oops Error occurred!",
        error: err,
      });
    } else {
      return res.json({
        success: true,
        data,
      });
    }
  });
});
router.post("/getEventdata", async (req,res) => {
  const { Id } = req.body;
   Eventmodel.find({_id: Id} ,(err, event) => {
    if(err) {
      return res.json({
        msg:"not found event"
      })
    }else {
      return res.json({
        success: true,
         event
      })
    }
  })
})


module.exports = router;

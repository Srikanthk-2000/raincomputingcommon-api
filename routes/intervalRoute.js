const express = require("express");
const Interval = require("../models/Interval");
const { Router } = require("express");
const router = express.Router();
router.get("/", (req, res) => res.send("interval Route"));

router.post("/eventCaseCreate", async (req, res) => {
  const { caseId, events } = req.body;
  try {
    const eventData = {
      caseId: caseId,

      events: events.map((event) => ({
        eventId: event.eventId,
        receivedDate: event.receivedDate,

        intervals: event.intervals.map((textObj) => ({
          responseText: textObj.responseText,
          responseDate: textObj.responseDate,
          isActive: true,
        })),
        createdAt: new Date(),
        aflag: true,
      })),
    };

    const createdEvents = await Interval.create(eventData);

    if (createdEvents) {
      return res.json({
        success: true,
        data: createdEvents,
      });
    } else {
      return res.json({
        success: false,
        msg: "Failed to create events",
      });
    }
  } catch (err) {
    console.log("event create error", err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
});
router.get("/getAllResponseTexts", async (req, res) => {
  Interval.find({}, (err, events) => {
    if (err) {
      return res.json({
        msg: "err",
      });
    } else {
      // Extract all responseTexts from events and flatten them into a single array
      const responseTexts = [...events.flatMap((event) => event.responseTexts)];
      return res.json({
        success: true,
        responseTexts,
      });
    }
  });
});

router.post("/getIntervalData", async (req, res) => {
  const { eventId } = req.body;
  const allIntervals = await Interval.find({});
  const events = allIntervals.flatMap((interval) => interval.events);
  const Eventdata = events.filter((event) => event.eventId == eventId);
  if (Eventdata) {
    return res.json({
      success: true,
      Eventdata,
    });
  } else {
    return res.json({
      msg: "Not found",
    });
  }
});

router.post("/getCaseIdByEvents", async (req, res) => {
  const { caseId } = req.body;
  Interval.find({ caseId: caseId }, (err, caseEvents) => {
    if (err) {
      return res.json({
        msg: "Not found",
      });
    } else {
      return res.json({
        success: true,
        caseEvents,
      });
    }
  });
});
router.post("/getCaseData", async (req, res) => {
  const { caseId, eventId } = req.body;
  Interval.find(
    { caseId: caseId, "events.eventId": eventId },
    (err, caseEvents) => {
      if (err) {
        return res.json({
          msg: "err",
        });
      } else {
        return res.json({
          success: true,
          caseEvents,
        });
      }
    }
  );
});
router.post("/getCaseIdIntervals", async (req, res) => {
  const { caseId } = req.body;
  try {
    const intervals = await Interval.find({ caseId: caseId,"intervals.isActive": true }).populate({
      path: "events.eventId",
      select: "eventName",
    });
    return res.json({
      success: true,
      intervals,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      error: "An error occurred while retrieving reminders.",
    });
  }
});
router.post("/getEventUpdate", async (req, res) => {
  const { caseId, eventId, receivedDate, events } = req.body;
  const updateData = {
    receivedDate: receivedDate,
    events: events.map((event) => ({
      eventId: event.eventId,
      eventName: event.eventName,
      intervals: event.intervals.map((textObj) => ({
        responseText: textObj.responseText,
        responseDate: textObj.responseDate,
      })),
    })),
  };

  const updateEvents = Interval.findOneAndUpdate(
    { caseId: caseId },
    { eventId: eventId },
    updateData,
    (err, events) => {
      if (err) {
        return res.json({
          msg: "Not found",
        });
      } else {
        return res.json({
          success: true,
          events,
        });
      }
    }
  );
});
router.post('/intervalIdUpdate', async (req, res) => {
  const { intervals } = req.body;

  try {
    const updatedIntervals = await Promise.all(
      intervals.map(async (interval) => {
        const { intervalId, notes, userId, isActive } = interval;

        const updatedInterval = await Interval.findOneAndUpdate(
          { 'events.intervals._id': intervalId }, // Find the interval by intervalId
          {
            $push: {
              'events.$[].intervals.$[interval].note': {
                notes,
                userId,
                createdAt: new Date(),
              },
            },
            $set: {
              'events.$[].intervals.$[interval].isActive': false,
            },
          },
          { new: true, arrayFilters: [{ 'interval._id': intervalId }] } // Return the updated document and apply array filters
        );

        return updatedInterval;
      })
    );
    // Return the updated intervals in the response
    return res.status(200).json({
      success: true,
      msg: 'Intervals updated successfully',
      updatedIntervals: updatedIntervals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: 'An error occurred while updating the intervals',
      error: err.message,
    });
  }
});
router.post("/getintervalIdData", async (req, res) => {
  const { intervalId } = req.body;
  try {
    Interval.findOne(
      { "events.intervals._id": intervalId },
     
    )
      .populate({
        path: "events.intervals.note.userId",
        select: "firstname lastname email",
        model: "UserModel",
      })
      .exec((err, interval) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: "An error occurred while finding the interval",
            error: err.message,
          });
        }

        if (!interval) {
          return res.status(404).json({
            success: false,
            msg: "Interval not found",
          });
        }

        const event = interval.events[0]; // Assuming you want the first event
        const intervalData = event.intervals.find(
          (int) => int._id && int._id.toString() === intervalId
        );

        if (!intervalData) {
          return res.status(404).json({
            success: false,
            msg: "Interval data not found",
          });
        }

        // Return the found interval data
        return res.status(200).json({
          success: true,
          msg: "Interval data found",
          intervalData,
        });
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred",
      error: err.message,
    });
  }
});
router.post("/intervalIdActive", async (req, res) => {
  const { intervals } = req.body;

  try {
    const updatedIntervals = await Promise.all(
      intervals.map(async (interval) => {
        const { intervalId } = interval;

        const updatedInterval = await Interval.findOneAndUpdate(
          { "events.intervals._id": intervalId }, // Find the interval by intervalId
          {
            $set: {
              "events.$[].intervals.$[interval].isActive": true,
              "events.$[].intervals.$[interval].note": [],
            },
          },
          {
            new: true,
            arrayFilters: [{ "interval._id": intervalId }],
          } // Return the updated document and apply array filters
        );

        return updatedInterval;
      })
    );

    // Return the updated intervals in the response
    return res.status(200).json({
      success: true,
      msg: "Intervals updated successfully",
      updatedIntervals: updatedIntervals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating the intervals",
      error: err.message,
    });
  }
});








module.exports = router;

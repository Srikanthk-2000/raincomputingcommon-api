const { Router } = require("express");
const Group = require("../models/Group");
const router = Router();
const RemainderModel = require("../models/RemainderModel");
const moment = require("moment");
const schedule = require("node-schedule");
const io = require("socket.io");
const { sendMail } = require("../services/mail.services");
const Message = require("../models/Message");
const cron = require("node-cron");
router.get("/", (req, res) => res.send(" Remainder Route"));

router.post("/create", async (req, res) => {
  try {
    const {
      groupId,
      messageId,
      caseId,
      title,
      userId,
      scheduledTime,
      selectedMembers,
      nextScheduledTime,
      createdBy,
    } = req.body;

    const struturedMembers = selectedMembers.map((m) => ({
      id: m,
    }));

    const remindersQuery = {
      groupId,
      userId,
      caseId,
      messageId,
      title,
      nextScheduledTime,
      scheduledTime, // Use scheduledTime instead of date and time
      selectedMembers: struturedMembers,
      createdBy,
    };

    RemainderModel.create(remindersQuery, (err, reminder) => {
      if (err) {
        return res.json({
          msg: err,
        });
      } else {
        return res.json({
          success: true,
          reminder,
        });
      }
    });
  } catch (err) {
    return res.json({ msg: err?.name || err });
  }
});
router.post("/getGroupIdByReminder", async (req, res) => {
  const { groupId } = req.body;

  try {
    const groupReminders = await RemainderModel.find({ groupId: groupId })
      .populate({
        path: "messageId",
        select: "_id messageData",
      })
      .populate({
        path: "selectedMembers.id",
        select: "_id firstname lastname email",
      })
      .populate({
        path: "selectedMembers.addedBy",
        select: "_id firstname lastname email",
      })
      .populate({
        path: "groupId",
        populate: {
          path: "groupMembers.id",
          select: "_id firstname lastname email",
        },
      })
      .exec(); // Execute the query

    return res.json({
      success: true,
      groupReminders,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      error: "An error occurred while retrieving reminders.",
    });
  }
});

router.post("/getAllReminders", async (req, res) => {
  try {
    const { currentUserID } = req.body;
    RemainderModel.find({
      isActive: true,
      userId: { $ne: currentUserID },
      selectedMembers: { $elemMatch: { id: currentUserID } },
    })
      .populate({
        path: "messageId",
        select: "_id messageData",
      })
      .populate({
        path: "selectedMembers.id selectedMembers.addedBy",
        select: "_id firstname lastname email",
      })
      .populate({
        path: "groupId",
        populate: {
          path: "groupMembers.id",
          select: " _id firstname lastname email",
        },
      })

      .exec((err, getReminders) => {
        if (err) {
          return res.json({
            msg: err,
          });
        } else {
          return res.json({
            success: true,
            reminders: getReminders,
          });
        }
      });
  } catch {
    return res.json({ msg: err });
  }
});

router.post("/getreminder", async (req, res) => {
  try {
    const { currentUserID } = req.body;
    const reminders = await RemainderModel.find({
      isActive: true,
      userId: { $ne: currentUserID },
      selectedMembers: { $elemMatch: { id: currentUserID } },
    })
      .populate({
        path: "messageId",
        select: "_id messageData",
      })
      .populate({
        path: "selectedMembers.id",
        select: "_id firstname lastname email",
      })
      .exec();
    // Schedule the reminders
    const scheduledReminders = [];
    const now = new Date();
    now.setHours(now.getHours() + 5);
    now.setMinutes(now.getMinutes() + 30);
    // Find the earliest reminder in the list
    const upcomingReminders = reminders.filter((reminder) => {
      const scheduledTimes = reminder.scheduledTime.filter(
        (time) => new Date(time) > now
      );
      // Update the reminder object with the filtered scheduledTimes
      reminder.scheduledTime = scheduledTimes;
      // Return the reminder object if it has scheduledTime values after filtering, otherwise return null
      return scheduledTimes.length > 0 ? reminder : null;
    });
    // Remove any null values from the upcomingReminders array
    const filteredUpcomingReminders = upcomingReminders.filter(
      (reminder) => reminder !== null
    );
    let responseData = { success: true, reminders: reminders };
    if (
      filteredUpcomingReminders.length > 0 ||
      upcomingReminders.length === 0
    ) {
      let nextScheduledTime = null;
      if (
        filteredUpcomingReminders.length > 0 &&
        filteredUpcomingReminders[0].scheduledTime &&
        filteredUpcomingReminders[0].scheduledTime[0]
      ) {
        nextScheduledTime = moment(
          filteredUpcomingReminders[0].scheduledTime[0]
        );
      }
      // console.log("filteredUpcomingReminders", filteredUpcomingReminders);
      // Iterate over all the reminders in the filteredUpcomingReminders array
      for (let i = 1; i < filteredUpcomingReminders.length; i++) {
        if (
          filteredUpcomingReminders[i].scheduledTime &&
          filteredUpcomingReminders[i].scheduledTime[0]
        ) {
          const scheduledTime = moment(
            filteredUpcomingReminders[i].scheduledTime[0]
          );
          // Compare the scheduledTime with the nextScheduledTime
          if (
            nextScheduledTime &&
            scheduledTime &&
            scheduledTime < nextScheduledTime
          ) {
            nextScheduledTime = scheduledTime;
          }
        }
      }
      const nextNotifyData = filteredUpcomingReminders.filter(
        (reminder) =>
          reminder.scheduledTime &&
          reminder.scheduledTime.some((time) =>
            moment(time).isSame(nextScheduledTime)
          )
      );
      responseData.nextNotificationTime = nextScheduledTime || null;
      responseData.nextReminders = nextNotifyData || [];
      responseData.nextScheduledTime = nextScheduledTime || null;
    }
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error getting reminders:", error);
    res.status(500).json({ success: false, error: "Error getting reminders" });
  }
});

router.post("/getreminderself", async (req, res) => {
  try {
    const { currentUserID } = req.body;
    const reminders = await RemainderModel.find({
      isActive: true,
      userId: currentUserID,
    })
      .populate({
        path: "groupId",
        select: "_id groupMembers",
      })
      .exec();
    const filteredReminders = reminders.filter((reminder) => {
      const groupMembers = reminder.groupId.groupMembers;
      const member = groupMembers.find((member) => {
        return (
          member.id.toString() === currentUserID.toString() && member.isActive
        );
      });
      return member;
    });
    return res.json({ success: true, reminders: filteredReminders });
  } catch (err) {
    // console.log("err: ", err);
    return res.json({ msg: err });
  }
});

router.put("/removeReminder", async (req, res) => {
  const { reminderId } = req.body;
  const removeReminder = await RemainderModel.findOneAndDelete({
    _id: reminderId,
  });

  if (!removeReminder) {
    res.status(404);
  } else {
    res.json({ success: true, removeReminder });
  }
});

router.put("/updateReminder", async (req, res) => {
  try {
    const { reminderId, title, userId, scheduledTime, selectedMembers } =
      req.body;
    // assuming you have defined the `userId` variable
    const struturedMembers = selectedMembers.map((m) => ({
      id: m,
      addedBy: userId,
    }));
    const data = {
      title: title,
      selectedMembers: struturedMembers,
      scheduledTime: scheduledTime,
    };
    const reminder = await RemainderModel.findByIdAndUpdate(
      { _id: reminderId },
      data,
      { new: true }
    );
    return res.json({ success: true, data: reminder });
  } catch (err) {
    console.log(err);
    return res.json({ msg: err.message });
  }
});

// cron.schedule("*/10 * * * * *", async () => {
//   const now = new Date();
//   now.setHours(now.getHours() + 5);
//   now.setMinutes(now.getMinutes() + 30);

//   const nextNotifyData = await RemainderModel.find({
//     isActive: true,
//     // nextScheduledTime: { $gt: now },
//   })
//     .populate({
//       path: "messageId",
//       select: "_id messageData",
//     })
//     .populate({
//       path: "selectedMembers.id",
//       select: "_id firstname lastname email",
//     })
//     .exec();

//   const scheduledRemindersData = [];
//   console.log("scheduledRemindersData", scheduledRemindersData);
//   const scheduledReminders = nextNotifyData.filter((reminder) =>
//     reminder.scheduledTime.some((time) => time > now)
//   );

//   const filteredReminders = scheduledReminders.filter((reminder) => {
//     const scheduledTime = new Date(reminder.nextScheduledTime);
//     const timeDifference = scheduledTime.getTime() - now.getTime();
//     const fifteenMinutesInMs = 15 * 60 * 1000;
//     return timeDifference > 0 && timeDifference < fifteenMinutesInMs;
//   });
//   // console.log("scheduledReminders", scheduledReminders);
//   // Loop through each reminder in the filteredReminders array
//   filteredReminders.forEach((reminder) => {
//     // Calculate the time difference between the current time and the reminder time
//     const timeDiff = reminder.nextScheduledTime - now;
//     if (timeDiff < 10000) {
//       // Schedule the reminder to be sent at the appropriate time
//       const timeoutId = setTimeout(async () => {
//         // Remove the scheduled reminder from the list
//         scheduledRemindersData.splice(
//           scheduledRemindersData.findIndex((r) => r.id === reminder._id),
//           1
//         );
//         scheduledReminders.splice(
//           scheduledReminders.findIndex((r) => r.id === reminder._id),
//           1
//         );
//         // Send the reminder to selected members
//         const selectedMembers = reminder.selectedMembers.map(
//           (member) => member.id.email
//         );
//         const nextScheduledTime = reminder.nextScheduledTime;

//         nextScheduledTime.setHours(nextScheduledTime.getHours() - 5);
//         nextScheduledTime.setMinutes(nextScheduledTime.getMinutes() - 30);

//         const mailOptions = {
//           to: selectedMembers,
//           subject: `Reminder Message: ${reminder.title}`,
//           html: `<div><h3>Hello, This is a Reminder Message from Rain Computing</h3>
//         <p>Your reminder Time is at ${nextScheduledTime}:</p>
//         <p>Title: ${reminder.title}</p>
//         <a href="http://raincomputing.net">View Reminder</a></div>`,
//         };

//         try {
//           await sendMail(mailOptions);
//           console.log("Reminder sent successfully");
//         } catch (error) {
//           console.error("Error sending reminder:", error);
//         }

//         //send the reminder to socket.io (message)
//         async function sendMessage() {
//           const messageQuery = {
//             groupId: reminder?.groupId,
//             sender: reminder?.createdBy,
//             receivers: reminder?.selectedMembers.map((member) => member.id._id),
//             messageData: `Reminder Message : ${reminder?.title}`,
//           };
//           let sendMessages = [];
//           if (nextNotifyData?.groupId) {
//             messageQuery.groupId = nextNotifyData.groupId;
//           }
//           try {
//             const createdMessage = await Message.create(messageQuery);
//             console.log("createdMessage :", createdMessage);
//             if (createdMessage) {
//               sendMessages.push(createdMessage);
//             }
//           } catch (error) {
//             console.error(error);
//           }
//         }
//         sendMessage();
//       }, timeDiff);

//       // Add the scheduled reminder to the list
//       scheduledRemindersData.push({ id: reminder._id, timeoutId: timeoutId });
//       // console.log("scheduledReminders", scheduledReminders);
//     } else {
//       console.log(
//         `Reminder notification time for "${reminder.title}" has already passed.`
//       );
//     }
//   });

//   if (scheduledReminders) {
//     scheduledReminders?.forEach(async (reminder) => {
//       const newNextScheduledTime = reminder?.scheduledTime.filter(
//         (time) => time > now
//       );
//       // console.log("start")
//       await RemainderModel.updateOne(
//         { _id: reminder._id },
//         { nextScheduledTime: newNextScheduledTime[0] }
//       );
//     });
//   }
// });
cron.schedule("*/10 * * * * *", async () => {
  const now = new Date();
  now.setHours(now.getHours() + 5);
  now.setMinutes(now.getMinutes() + 30);

  const nextNotifyData = await RemainderModel.find({
    isActive: true,
    // nextScheduledTime: { $gt: now },
  })
    .populate({
      path: "messageId",
      select: "_id messageData",
    })
    .populate({
      path: "selectedMembers.id",
      select: "_id firstname lastname email",
    })
    .exec();

  const scheduledRemindersData = [];
  console.log("scheduledRemindersData", scheduledRemindersData);
  const scheduledReminders = nextNotifyData.filter((reminder) =>
    reminder.scheduledTime.some((time) => time > now)
  );

  const filteredReminders = scheduledReminders.filter((reminder) => {
    const scheduledTime = new Date(reminder.nextScheduledTime);
    const timeDifference = scheduledTime.getTime() - now.getTime();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    const tenMinutesInMs = 10 * 60 * 1000;
    return (
      timeDifference > tenMinutesInMs && timeDifference < fifteenMinutesInMs
    );
  });
  // console.log("scheduledReminders", scheduledReminders);
  // Loop through each reminder in the filteredReminders array
  filteredReminders.forEach((reminder) => {
    // Calculate the time difference between the current time and the reminder time
    const timeDiff = reminder.nextScheduledTime - now - 10 * 60 * 1000;
    if (timeDiff < 10000) {
      // Schedule the reminder to be sent at the appropriate time
      const timeoutId = setTimeout(async () => {
        // Remove the scheduled reminder from the list
        scheduledRemindersData.splice(
          scheduledRemindersData.findIndex((r) => r.id === reminder._id),
          1
        );
        scheduledReminders.splice(
          scheduledReminders.findIndex((r) => r.id === reminder._id),
          1
        );
        // Send the reminder to selected members
        const selectedMembers = reminder.selectedMembers.map(
          (member) => member.id.email
        );
        const nextScheduledTime = reminder.nextScheduledTime;

        nextScheduledTime.setHours(nextScheduledTime.getHours() - 5);
        nextScheduledTime.setMinutes(nextScheduledTime.getMinutes() - 30);

        // const options = { timeZone: 'Asia/Kolkata' };
        // const formattedTime = nextScheduledTime.toLocaleString('en-US', options)
        const mailOptions = {
          to: selectedMembers,
          subject: `Reminder Message: ${reminder.title}`,
          html: `<div><h3>Hello, This is a Reminder Message from Rain Computing</h3>
        <p>Your reminder Time is at ${nextScheduledTime}:</p>
        <p>Title: ${reminder.title}</p>
        <a href="http://raincomputing.net">View Reminder</a></div>`,
        };

        try {
          await sendMail(mailOptions);
          console.log("Reminder sent successfully");
        } catch (error) {
          console.error("Error sending reminder:", error);
        }

        //send the reminder to socket.io (message)
        async function sendMessage() {
          const messageQuery = {
            groupId: reminder?.groupId,
            sender: reminder?.createdBy,
            receivers: reminder?.selectedMembers.map((member) => member.id._id),
            messageData: `Reminder Message : ${reminder?.title}`,
          };
          let sendMessages = [];
          if (nextNotifyData?.groupId) {
            messageQuery.groupId = nextNotifyData.groupId;
          }
          try {
            const createdMessage = await Message.create(messageQuery);
            console.log("createdMessage :", createdMessage);
            if (createdMessage) {
              sendMessages.push(createdMessage);
            }
          } catch (error) {
            console.error(error);
          }
        }
        sendMessage();
      }, timeDiff);

      // Add the scheduled reminder to the list
      scheduledRemindersData.push({ id: reminder._id, timeoutId: timeoutId });
      // console.log("scheduledReminders", scheduledReminders);
    } else {
      console.log(
        `Reminder notification time for "${reminder.title}" has already passed.`
      );
    }
  });

  if (scheduledReminders) {
    scheduledReminders?.forEach(async (reminder) => {
      const newNextScheduledTime = reminder?.scheduledTime.filter(
        (time) => time > now
      );
      // console.log("start")
      await RemainderModel.updateOne(
        { _id: reminder._id },
        { nextScheduledTime: newNextScheduledTime[0] }
      );
    });
  }
});

module.exports = router;

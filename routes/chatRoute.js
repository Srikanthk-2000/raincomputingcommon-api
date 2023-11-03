const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.send("Chat Route"));

router.post("/createChatRoom", async (req, res) => {
  const { members, isGroup, groupName } = req.body;
  let roomQuery = {
    members: members.sort(),
    lastModified: Date.now(),
    createdAt: Date.now(),
  };
  if (isGroup) {
    roomQuery.isGroup = isGroup;
    roomQuery.groupName = groupName || "Group chat";
  }

  try {
    const { members } = req.body;
    ChatRooms.find({ members: members.sort() }, (err, isRoom) => {
      if (err) {
        return res.json({ msg: err });
      } else {
        if (isRoom.length < 1) {
          ChatRooms.create(roomQuery, (err, room) => {
            if (err) {
              return res.json({ msg: err });
            } else {
              ChatRooms.findById(room._id)
                .populate("members")
                .exec((err, chat) => {
                  if (err) {
                    return res.json({ msg: err });
                  } else {
                    return res.json({ success: true, room: chat });
                  }
                });
              // return res.json({ success: true, room });
            }
          });
        } else {
          ChatRooms.findById(isRoom[0]._id)
            .populate("members")
            .exec((err, chat) => {
              if (err) {
                return res.json({ msg: err });
              } else {
                return res.json({ success: true, room: chat });
              }
            });
          // return res.json({ success: true, room: isRoom[0] });
        }
      }
    });
  } catch (err) {
    return res.json({ msg: err });
  }
});

router.post("/getAllChatRoomByUserId", async (req, res) => {
  try {
    const { userID } = req.body;
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    ChatRooms.find({ members: userID, aflag: true }, null, {
      limit,
      skip,
      sort: { lastModified: -1 },
    })
      .populate({
        path: "members",
        select: "firstname lastname",
        // match: { _id: { $ne: userID } },
      })
      .exec((err, chats) => {
        if (err) {
          console.log("erro", err);
          return res.json({ msg: err });
        } else {
          return res.json({ success: true, chats });
        }
      });
  } catch (err) {
    return res.json({ msg: "error" });
  }
});

router.post("/getChatRoomById", async (req, res) => {
  try {
    const { chatRoomId } = req.body;
    ChatRooms.findById(chatRoomId)
      .populate("members")
      .exec((err, chat) => {
        if (err) {
          return res.json({ msg: err });
        } else {
          return res.json({ success: true, chat });
        }
      });
  } catch (err) {
    return res.json({ msg: "error" });
  }
});

router.post("/sendMessage", async (req, res) => {
  try {
    const { sender, receivers, chatRoomId, messageData } = req.body;
    const messageQuery = {
      chatRoomId,
      message: {
        sender,
        receivers,
        messageData,
      },
    };
    Chat.create(messageQuery, (err, message) => {
      if (err) {
        return res.json({ msg: err });
      } else {
        return res.json({ success: true, message });
      }
    });
  } catch (err) {
    return res.json({ msg: err });
  }
});

router.post("/getRoomMessages", async (req, res) => {
  try {
    const { chatRoomId } = req.body;
    Chat.find({ chatRoomId })
      .populate("attachments")
      // .populate("message.receivers")
      .exec((err, messages) => {
        if (err) {
          return res.json({ msg: err });
        } else {
          return res.json({ success: true, messages });
        }
      });
  } catch (err) {
    return res.json({ msg: "error" });
  }
});

router.put("/deleteChat", async (req, res) => {
  const { chatRoomId } = req.body;
  const deletedGroup = await ChatRooms.findByIdAndUpdate(chatRoomId, {
    aflag: false,
    lastModified: Date.now(),
  });
  if (!deletedGroup) {
    res.status(404);
  } else {
    res.json({ success: true, deletedGroup });
  }
});
router.put("/removeGroupmember", async (req, res) => {
  const { chatRoomId, members } = req.body;
  const removed = await ChatRooms.findByIdAndUpdate(
    chatRoomId,
    {
      $pullAll: { members },
      lastModified: Date.now(),
    },
    {
      new: true,
    }
  );
  if (!removed) {
    res.status(404);
  } else {
    res.json({ success: true, removed });
  }
});

router.put("/addtoGroup", async (req, res) => {
  const { chatRoomId, members, groupName } = req.body;
  const added = await ChatRooms.findByIdAndUpdate(
    chatRoomId,
    {
      $push: { members },
      lastModified: Date.now(),
      groupName: groupName,
    },
    {
      new: true,
    }
  );
  if (!added) {
    res.status(404);
  } else {
    res.json({ success: true, added });
  }
});

module.exports = router;

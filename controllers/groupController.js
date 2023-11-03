const config = require("../config");
const Group = require("../models/Group");

const CREATE_GROUP = async (req, res) => {
  try {
    const { caseId, groupName, members, admin, color, threadId } = req.body;
    const isGroupExisting = await Group.findOne({
      caseId,
      groupName,
      aflag: true,
    });
    if (isGroupExisting) return res.json({ msg: "Group already existing" });
    const struturedMembers = members.map((m) => ({ id: m, addedBy: admin }));
    const groupQuery = {
      caseId,
      groupName,
      groupMembers: struturedMembers,
      isParent: false,
      isGroup: true,
      admins: [admin],
      color: color,
      threadId: threadId,
    };
    const createdGroup = await Group.create(groupQuery);
    if (createdGroup) return res.json({ success: true, group: createdGroup });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const CREATE_ONE_ON_ONE_CHAT = async (req, res) => {
  try {
    const { members } = req.body;
    const sortedmembers = members.sort();
    const isChat = await Group.findOne({
      isGroup: false,
      admins: sortedmembers,
    }).populate("groupMembers.id", "firstname lastname email profilePic");

    if (isChat) {
      isChat.aflag = true; // Add flag with value true
      await isChat.save(); // Save the updated document
      return res.json({ success: true, group: isChat });
    }

    const struturedMembers = sortedmembers.map((m) => ({ id: m }));
    const chatQuery = {
      groupMembers: struturedMembers,
      admins: sortedmembers,
      aflag: true, // Add flag with value true for the new chat
    };

    const createdChat = await Group.create(chatQuery);
    if (createdChat) {
      const newChat = await Group.findById(createdChat._id).populate(
        "groupMembers.id",
        "firstname lastname email profilePic"
      );
      return res.json({ success: true, group: newChat });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const GET_ONE_ON_ONE_CHAT = async (req, res) => {
  try {
    const { userId } = req.body;
    const chats = await Group.find(
      {
        isGroup: false,
        aflag: true,
        groupMembers: {
          $elemMatch: {
            id: userId,
            isActive: true,
          },
        },
      },
      null,
      { sort: { updatedAt: -1 } }
    ).populate("groupMembers.id", "firstname lastname email profilePic");
    if (chats) return res.json({ success: true, groups: chats });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const GETBYCASEID_USERID = async (req, res) => {
  try {
    const { caseId, userId } = req.body;
    const groups = await Group.find(
      {
        caseId,
        aflag: true,
        groupMembers: {
          $elemMatch: {
            id: userId,
            isActive: true,
          },
        },
      },
      null,
      {
        sort: {
          isParent: -1,
          updatedAt: -1,
        },
      }
    ).populate("groupMembers.id", "firstname lastname email");
    if (groups && groups.length > 0)
      return res.json({ success: true, groups: groups });
    else return res.json({ msg: "No groups Found" });
  } catch (err) {
    console.log("group error", err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const UPDATE_GROUP = async (req, res) => {
  try {
    const {
      groupId,
      groupName,
      members,
      admin,
      color,
      deleteIt,
      threadIdCondition,
    } = req.body;
    if (deleteIt) {
      const deletedGroup = await Group.findByIdAndUpdate(groupId, {
        aflag: false,
      });
      if (deletedGroup)
        return res.json({ success: true, groupName: deletedGroup?.groupName });
    }
    const struturedMembers = members.map((m) => ({ id: m, addedBy: admin }));
    const updateQuery = {
      groupName,
      groupMembers: struturedMembers,
      color,
      threadIdCondition,
    };
    const updatedGroup = await Group.findByIdAndUpdate(groupId, updateQuery);
    if (updatedGroup) {
      return res.json({ success: true, groupName, updatedGroup });
    }
  } catch (err) {
    console.log("group update error", err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

module.exports.groupController = {
  CREATE_GROUP,
  GETBYCASEID_USERID,
  CREATE_ONE_ON_ONE_CHAT,
  GET_ONE_ON_ONE_CHAT,
  UPDATE_GROUP,
};

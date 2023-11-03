const config = require("../config");
const Case = require("../models/Case");
const Group = require("../models/Group");
const userModel = require("../models/userModel");

const GET_COUNT = async (req, res) => {
  try {
    const { userId } = req.body;
    const userCount = await userModel.countDocuments({ aflag: true });
    const chatCount = await Group.countDocuments({
      isGroup: false,
      aflag: true,
      groupMembers: {
        $elemMatch: {
          id: userId,
          isActive: true,
        },
      },
    });
    const caseCount = await Case.countDocuments({
      caseMembers: {
        $elemMatch: {
          id: userId,
          isActive: true,
        },
      },
      aflag: true,
    });
    return res.json({ success: true, userCount, chatCount, caseCount });
  } catch (err) {
    return res.json({
      msg: err || config.DEFAULT_RES_ERROR,
    });
  }
};

module.exports.bffController = { GET_COUNT };

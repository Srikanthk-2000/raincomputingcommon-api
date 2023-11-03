const { default: mongoose } = require("mongoose");
const config = require("../config");
const Case = require("../models/Case");
const Group = require("../models/Group");
const userModel = require("../models/userModel");
const axios = require("axios");

const CREATE = async (req, res) => {
  try {
    const {
      caseId,
      caseName,
      members,
      admin,
      serialNumber,
      docDate,
      docEvent,
      maincaseId,
      isSubcase,
      threadId,
      threadIdCondition,
    } = req.body;
    const isCaseId = await Case.findOne({ caseId });
    if (isCaseId) return res.json({ msg: "Case Id Already existing" });
    const struturedMembers = members.map((m) => ({ id: m, addedBy: admin }));
    const caseQuery = {
      caseId,
      caseName,
      caseMembers: struturedMembers,
      notifyMembers: members,
      admins: [admin],
      serialNumber,
      maincaseId: maincaseId,
      isSubcase: isSubcase,
      threadId: threadId,
      threadIdCondition,
    };
    const createdCase = await Case.create(caseQuery);
    if (createdCase) {
      const groupQuery = {
        caseId: createdCase?._id,
        groupMembers: struturedMembers,
        isGroup: true,
        admins: [admin],
        threadId: createdCase?.threadId,
        threadIdCondition: createdCase?.threadIdCondition,
      };
      const createdGroup = await Group.create(groupQuery);
      if (createdGroup)
        return res.json({
          success: true,
          case: createdCase._id,
          group: createdGroup._id,
        });
    }
  } catch (err) {
    return res.json({
      msg: err || config.DEFAULT_RES_ERROR,
    });
  }
};

const GETBYUSERID = async (req, res) => {
  try {
    const { userId, page = 1, limit = 50, searchText = "" } = req.body;
    const skip = (page - 1) * limit;
    const userCases = await Case.find(
      {
        $or: [
          { caseName: { $regex: "^" + searchText, $options: "i" } },
          { caseId: { $regex: "^" + searchText, $options: "i" } },
        ],
        caseMembers: {
          $elemMatch: {
            id: userId,
            isActive: true,
          },
        },
        aflag: true,
        isSubcase: { $ne: true },
      },
      null,
      { limit: limit, skip: skip }
    ).populate([
      { path: "caseMembers.id", select: "firstname lastname profilePic email" },
      { path: "caseMembers.addedBy", select: "firstname lastname" },
    ]);

    if (userCases && userCases.length > 0)
      return res.json({ success: true, cases: userCases });
    else return res.json({ msg: "No cases Found" });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

// const UPDATE_CASE = async (req, res) => {
//   try {
//     const { id, caseId, caseName, serialNumber, docEvent, docDate, members, admin, deleteIt } = req.body;

//     if (deleteIt) {
//       const deletedCase = await Case.findByIdAndUpdate(id, {
//         aflag: false,
//       });

//       if (deletedCase) {
//         return res.json({
//           success: true,
//           caseId: deletedCase.caseId,
//         });
//       }
//     } else {
//       const structuredMembers = members.map((m) => ({ id: m, addedBy: admin }));
//       const updateQuery = {
//         caseName,
//         caseId,
//         docDate,
//         docEvent,
//         serialNumber,
//         caseMembers: structuredMembers,
//         notifyMembers: members,
//       };

//       const updatedCase = await Case.findByIdAndUpdate(id, updateQuery, { new: true })
//         .populate([
//           { path: "caseMembers.id", select: "firstname lastname profilePic email" },
//           { path: "caseMembers.addedBy", select: "firstname lastname" },
//         ]);

//       if (updatedCase) {
//         const everyoneGroup = await Group.findOne({
//           caseId: id,
//           isParent: true,
//         });

//         if (everyoneGroup) {
//           const updateQueryForGroup = {
//             groupMembers: structuredMembers,
//           };

//           await Group.findByIdAndUpdate(everyoneGroup._id, updateQueryForGroup);
//         }

//         return res.json({
//           success: true,
//           updatedCase,
//         });
//       }
//     }
//   } catch (err) {
//     console.log("Case update error", err);
//     return res.json({ msg: err || config.DEFAULT_RES_ERROR });
//   }
// };
const UPDATE_CASE = async (req, res) => {
  try {
    const {
      id,
      caseId,
      caseName,
      serialNumber,
      members,
      admin,
      deleteIt,
      threadIdCondition,
    } = req.body;

    if (deleteIt) {
      const deletedCase = await Case.findByIdAndUpdate(id, {
        aflag: false,
      });

      if (deletedCase) {
        return res.json({
          success: true,
          caseId: deletedCase.caseId,
        });
      }
    } else {
      const structuredMembers = members.map((m) => ({ id: m, addedBy: admin }));
      const updateQuery = {
        caseName,
        caseId,
        serialNumber,
        caseMembers: structuredMembers,
        threadIdCondition,
      };

      const updatedCase = await Case.findByIdAndUpdate(id, updateQuery, {
        new: true,
      })
      .populate([
        {
          path: "caseMembers.id",
          select: "firstname lastname profilePic email",
        },
        { path: "caseMembers.addedBy", select: "firstname lastname" },
      ]);

      if (updatedCase) {
        if (threadIdCondition) {
          // If threadIdCondition is provided, update the Group as well
          const updateGroup = {
            threadIdCondition,
          };
          const casebyId = mongoose.Types.ObjectId(id);

          const updatedGroup = await Group.findOneAndUpdate(
            { caseId: casebyId },
            updateGroup,
            { new: true }
          );
        }
        return res.json({
          success: true,
          updatedCase,
        });
      } else {
        return res.json({
          success: false,
          msg: "Case not found or update failed.",
        });
      }
    }
  } catch (err) {
    console.log("Case update error", err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const EVENT_CREATE = async (req, res) => {
  const { caseId, events } = req.body;
  try {
    const cases = await Case.findById(caseId);
    if (!cases) {
      return res.status(404).json({ error: "Case not found" });
    }
    const newEvent = events.map((event) => ({
      eventId: event.eventId,
      docEvent: event?.docEvent,
      eventText: event?.eventText.map((textObj) => ({
        text: textObj.text,
        docDate: textObj.docDate,
      })),
      receivedDate: event?.receivedDate,
    }));
    cases.events.push(...newEvent);
    await cases.save();
    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// const EVENT_CREATE = async (req, res) => {
//   const { caseId, events } = req.body;
//   try {
//     const cases = await Case.findById(caseId);
//     if (!cases) {
//       return res.status(404).json({ error: "Case not found" });
//     }
//     const newEvent = events.map((event) => ({
//       docDate: event?.docDate,
//       docEvent: event?.docEvent,
//       eventText: event?.eventText[0], // Access the first item of eventText array
//       receivedDate: event?.receivedDate,
//     }));
//     console.log("newEvent:", newEvent);
//     cases.events.push(...newEvent);
//     await cases.save();
//     res.status(200).json({ success: true, data: cases });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error" });
//   }
// };

const GETALLEVENTS = async (req, res) => {
  try {
    const { caseId } = req.body;

    const allEvents = await Case.find({
      _id: caseId,
    });
    if (allEvents) {
      return res.json({ success: true, events: allEvents[0].events });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const ADD_ADMIN = async (req, res) => {
  try {
    const { admin, caseId } = req.body;
    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      {
        $push: { admins: admin },
      },
      { new: true }
    );
    if (updatedCase) {
      return res.json({ success: true, updatedCase });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const REMOVE_ADMIN = async (req, res) => {
  try {
    const { admin, caseId } = req.body;
    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      {
        $pull: { admins: admin },
      },
      { new: true }
    );
    if (updatedCase) {
      return res.json({ success: true, updatedCase });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const LEAVE_CASE = async (req, res) => {
  try {
    const { caseId, memberId } = req.body;

    // Find all the groups related to the caseId
    const groups = await Group.find({ caseId });

    // Remove the member from all the related groups
    const updates = groups.map((group) => {
      return Group.findByIdAndUpdate(
        group._id,
        {
          $pull: { groupMembers: { id: memberId } },
        },
        { new: true }
      );
    });
    const updatedGroups = await Promise.all(updates);

    // Update the case to remove the member
    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      {
        $pull: {
          caseMembers: { id: memberId },
          notifyMembers: memberId,
        },
      },
      { new: true }
    );

    if (updatedCase && updatedGroups) {
      return res.json({ success: true, updatedCase, updatedGroups });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const COMPLETED_CASE = async (req, res) => {
  try {
    const { caseId } = req.body;
    const completedCases = await Case.findByIdAndUpdate(
      caseId,
      {
        isCompleted: true,
      },
      { new: true }
    );

    if (completedCases) {
      // Remove the completed case from the user's cases array
      const updatedCase = await Case.findByIdAndUpdate(
        caseId,
        {
          caseMembers: [],
          notifyMembers: [],
        },
        { new: true }
      );

      return res.json({ success: true, completedCases: updatedCase });
    } else {
      return res.json({ success: false, message: "Failed to complete case" });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const GETCOMPLETEDCASES = async (req, res) => {
  try {
    const { userId } = req.body;

    const allcompletedCases = await Case.find({
      admins: userId,
      isCompleted: true,
    });
    if (allcompletedCases) {
      return res.json({ success: true, allcompletedCases });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const SEARCHCASEBYSNO = async (req, res) => {
  try {
    const { serialNumber } = req.body;
    const apiUrl = "https://tsdrapi.uspto.gov/ts/cd/casestatus/";
    const apiKey = "Q8kerMro5tRHfe0Kd9x7bgwlTZ6nOt51";
    const url = `${apiUrl}${serialNumber}/info`;
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "USPTO-API-KEY": apiKey,
      },
    });
    // Send the response data back to the client
    return res.json(response.data);
  } catch (error) {
    console.error(error);
    // Send an error response to the client
    return res.json({
      msg: "not found",
      error,
    });
  }
};
const CREATE_SUBCASE = async (req, res) => {
  const { caseId, subCase } = req.body;

  try {
    // Find the parent case based on the provided caseId
    const parentCase = await Case.findById(caseId);

    if (!parentCase) {
      return res.status(404).json({ error: "Parent case not found" });
    }

    // Create subcases using the provided subCase array
    const createdSubCases = [];
    for (const subCaseItem of subCase) {
      const {
        caseName,
        serialNumber,
        caseMembers,
        notifyMembers,
        admins,
        aflag,
        isCompleted,
      } = subCaseItem;

      // Create a new subcase object
      const newSubCase = {
        caseName,
        serialNumber,
        caseMembers,
        notifyMembers,
        admins,
        aflag,
        isCompleted,
      };

      // Push the new subcase to the parent case's subCase array
      const createdSubCase = await parentCase.subCase.create(newSubCase);
      createdSubCases.push(createdSubCase);

      // Add the created subcase to the parent case
      parentCase.subCase.push(createdSubCase);
    }

    // Save the parent case to persist the changes
    await parentCase.save();

    // Get the _id of each created subcase
    const createdSubCaseIds = createdSubCases.map((subCase) => subCase._id);

    // Create a group query
    const groupQuery = {
      caseId: parentCase._id,
      // groupMembers: createdSubCaseIds.map((subCase) => ({ id: subCase, addedBy: admin })),
      isGroup: true,
      // admins: [admin],
    };

    // Create the group
    const createdGroup = await Group.create(groupQuery);

    // Return the created subcases, their IDs, and the group ID
    return res.json({
      success: true,
      SubCase: createdSubCases,
      CreatedSubCaseIds: createdSubCaseIds,
      GroupId: createdGroup._id,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    res.status(500).json({ error: "Failed to create subcases" });
  }
};
const CASEIDBY_SUBCASES = async (req, res) => {
  const { caseId } = req.body;
  try {
    const caseIdSubCases = await Case.find({
      maincaseId: caseId,
      isSubcase: true,
      caseMembers: {
        $elemMatch: {
          isActive: true,
        },
      },
      aflag: true,
    })
      .populate([
        {
          path: "caseMembers.id",
          select: "firstname lastname profilePic email",
        },
        { path: "caseMembers.addedBy", select: "firstname lastname" },
      ])
      .exec();

    if (caseIdSubCases && caseIdSubCases.length > 0) {
      return res.json({
        success: true,
        caseIdSubCases,
      });
    } else {
      return res.json({ msg: "No subcases found" });
    }
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve subcases" });
  }
};

const GET_ALL_SUBCASES = async (req, res) => {
  try {
    const allsubCases = await Case.find({ isSubcase: true })
      .populate([
        {
          path: "caseMembers.id",
          select: "firstname lastname profilePic email",
        },
        { path: "caseMembers.addedBy", select: "firstname lastname" },
        // Add more population paths here if needed
      ])
      .exec();

    if (allsubCases) {
      return res.json({
        success: true,
        allsubCases,
      });
    }
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve subcases" });
  }
};

module.exports.caseController = {
  LEAVE_CASE,
  CREATE,
  GETBYUSERID,
  COMPLETED_CASE,
  UPDATE_CASE,
  EVENT_CREATE,
  GETALLEVENTS,
  ADD_ADMIN,
  GETCOMPLETEDCASES,
  REMOVE_ADMIN,
  SEARCHCASEBYSNO,
  CREATE_SUBCASE,
  CASEIDBY_SUBCASES,
  GET_ALL_SUBCASES,
};

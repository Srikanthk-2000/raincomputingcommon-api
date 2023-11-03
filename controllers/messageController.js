const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable");
const moment = require("moment");
const config = require("../config");
const Message = require("../models/Message");
const { sendMail } = require("../services/mail.services");

const SENDMESSAGE = async (req, res) => {
  try {
    const {
      caseId,
      groupId,
      sender,
      receivers,
      messageData,
      isAttachment,
      attachments,
      isForward,
      maincaseId,
      threadId
    } = req.body;
    const messageQuery = {
      groupId,
      sender,
      receivers,
      messageData,
      isAttachment,
      attachments,
      isForward,
      maincaseId,
      threadId
    };
    if (caseId) {
      messageQuery.caseId = caseId;
    }
    const createdMessage = await Message.create(messageQuery);
    if (createdMessage) return res.json({ success: true, createdMessage });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const FILENOTES = async (req, res) => {
  try {
    const { id, attachmentId, note } = req.body;
    const findQuery = {
      _id: id,
      "attachments.id": attachmentId,
    };
    const isFound = await Message.findOneAndUpdate(
      findQuery,
      { $set: { "attachments.$.note": note } },
      { returnDocument: "after" }
    );
    return res.json({ success: true, isFound });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const REPLYMESSAGE = async (req, res) => {
  try {
    const { id, sender, msg } = req.body;
    const replyQuery = {
      sender,
      replyMsg: msg,
    };
    const replyMessage = await Message.findByIdAndUpdate(id, {
      $push: { replies: replyQuery }, 
      isReply: true, // add this line to update the flag
    },{new:true});
    if (replyMessage) return res.json({ success: true, replyMessage });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};


const GETMESSAGES = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const groupMessages = await Message.find({
      groupId,
      aflag: true,
      cleardBy: { $ne: [userId] },
    });
    if (groupMessages)
      return res.json({
        success: true,
        groupMessages,
      });
  } catch (err) {
    console.log(err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const GETMESSAGEBYID = async (req, res) => {
  try {
    const { msgId } = req.body;
    Message.findById(msgId, async (err, Msg) => {
      if (err) {
        return res.json({
          msg: err,
        });
      } else if (Msg) {
        return res.json({
          success: true,
          Msg,
        });
      } else {
        return res.json({
          msg: `No Msg Found `,
        });
      }
    });
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
};
const DELETEMSG = async (req, res) => {
  try {
    const { id, deleteIt, createdAt } = req.body;
    // today = new Date();
    // time1 = today.valueOf();
    // date1 = new Date(createdAt);
    //time2 = new Date().getMinutes();
    // time2 = date1.valueOf();
    // time3 = time1 - time2;
    if (deleteIt) {
      // if (time3 < 60000) {
        const deletedmsg = await Message.findByIdAndUpdate({_id: id}, {
          aflag: false,
        },{new: true});
        if (deletedmsg)
          return res.json({ success: true, DeletedMessage:deletedmsg
            //  time1, time2, time3 
            });
      // } 
      // else {
      //   return res.json({
      //     msg: "Unable to Delete later",
      //   });
      // }
    } else {
      return res.json({
        msg: "Unable to Delete",
      });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const UPDATE_MESSAGE = async (req, res) => {
  try {
    const { _id, messageData, sender } = req.body;

    const updateQuery = {
      messageData,
      sender,
      isEdit: true, // If you want to update the sender field
    };
    const updatedMessage = await Message.findByIdAndUpdate(_id, updateQuery, {
      new: true,
    });
    return res.json({ success: true, updatedMessage });
  } catch (err) {
    console.log("Case update error", err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

const GETFILES = async (req, res) => {
  try {
    const { caseId, searchText = "" } = req.body;
    const filesQuery = {
      caseId,
      aflag: true,
      isAttachment: true,
      "attachments.aflag": true,
      "attachments.name": { $regex: "^" + searchText, $options: "i" },
    };
    const files = await Message.find(filesQuery).populate({
      path: "sender",
      select: "firstname lastname _id",
    });
    if (files?.length > 0) {
      let struturedFiles = [];
      files.map((f) => {
        const senderName = f?.sender?.firstname + " " + f?.sender?.lastname;
        const senderId = f?.sender?._id;
        const time = f?.createdAt;
        const msgId = f?._id;
        f?.attachments?.map((a) => {
          const typeIndex = a?.name.indexOf(".");
          const type = a?.name.slice(typeIndex !== 0 ? typeIndex + 1 : 0);
          const size = a?.size;
          const id = a?.id;
          const name = a?.name;
          const note = a?.note;
          struturedFiles.push({
            msgId,
            id,
            senderName,
            senderId,
            type,
            name,
            size,
            time,
            note,
          });
        });
      });
      return res.json({
        success: true,
        files: struturedFiles,
      });
    } else {
      return res.json({
        msg: "No Files Found",
      });
    }
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const MAIL_CHAT = async (req, res) => {
  try {
    const { mail, chatRoomId, caseName, groupName } = req.body;
    const chatMessages = await Message.find({
      groupId: chatRoomId,
    }).populate({
      path: "sender",
      select: "firstname lastname email",
    });
    const doc = new jsPDF();
    const header = [
      ["Sender", "message", "Time", "Group name", "Case name", "Attachments"],
    ];
    let rows = [];
    chatMessages.map((m) => {
      const sender = m?.sender?.firstname + " " + m?.sender?.lastname;
      const message = m?.messageData;
      const time = moment(m?.createdAt).format("DD-MM-YY HH:mm");
      const attachments = m.isAttachment ? m.attachments?.length : "-";
      const tempRow = [sender, message, time, groupName, caseName, attachments];

      rows.push(tempRow);
    });
    doc.autoTable({
      bodyStyles: { valign: "top" },
      margin: {
        top: 30,
      },
      head: header,
      body: rows,
      theme: "grid",
      columnStyles: { 5: { halign: "center" } },
      headStyles: {
        fillColor: [0, 0, 230],
        fontSize: 12,
        fontStyle: "bold",
        font: "courier",
        halign: "center",
      },
      willDrawCell: (data) => {
        if (
          data.section === "body" &&
          data.column.index === 5 &&
          data.cell.raw !== "-"
        ) {
          data.doc.setFillColor("green");
          data.doc.setTextColor("black");
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text(`${caseName}-${groupName}`, data.settings.margin.left, 20);
      },
    });
    const docName = `${caseName}-${groupName}-${moment(Date.now()).format(
      "DD-MM-YY HH:mm"
    )}`;
    // doc.save(docName)
    const mailOptions = {
      to: mail,
      subject: "Chat Messages",
      html: `<p>Chat Messages for + ${docName}</p>`,
      attachments: [
        {
          filename: `${docName}.pdf`,
          content: doc.output(),
        },
      ],
    };
    const mailSent = await sendMail(mailOptions);
    res.json({ success: true, mailSent });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const GETSENDERBYNAMEID = async (req, res) => {
  try {
    const { sender } = req.body;
    const senderName = {
      sender,
      aflag: true,
    };
    const senderDetails = await Message.find(senderName).populate({
      path: "sender",
      select: "firstname lastname",
    });
    if (senderDetails)
      return res.json({
        success: true,
        senderDetails,
      });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const GETGROUPBYNAMEID = async (req, res) => {
  try {
    const { caseId } = req.body;
    const groupName = {
      caseId,
      aflag: true,
    };
    const caseDetails = await Message.find(groupName).populate({
      path: "caseId",
      select: "caseName ",
    });
    if (caseDetails)
      return res.json({
        success: true,
        caseDetails,
      });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const PINNEDMESSAGE = async (req, res) => {
  try {
    const { Id } = req.body;
    const pinnedMessage = await Message.findByIdAndUpdate(
      Id,
      { isPinned: true },
      { new: true }
    );
    if (pinnedMessage)
      return res.json({ success: true, message: pinnedMessage });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const UNPINNEDMESSAGE = async (req, res) => {
  try {
    const { Id } = req.body;
    const pinnedMessage = await Message.findByIdAndUpdate(
      Id,
      { isPinned: false },
      { new: true }
    );
    if (pinnedMessage)
      return res.json({ success: true, message: pinnedMessage });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};
const GETPINMESSAGES = async (req, res) => {
  try {
    const { groupId } = req.body;
    const pinMessages = await Message.find({
      groupId,
      isPinned: true,
    });
    if (pinMessages)
      return res.json({
        success: true,
        pinMessages,
      });
  } catch (err) {
    console.log(err);
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

// const DELETE_CHAT = async (req, res) => {
//   try {
//     const { id } = req.body;
//     console.log("rk req.body:",req?.body)
//     console.log("rk id:",id)
//     if (id) {
//       const deletedChat = await Group.findByIdAndUpdate(id, {
//         aflag: false,
//       },{new:true});
//     console.log("rk deletedChat:",deletedChat)
//       if (deletedChat)
//         return res.json({ success: true ,res:deletedChat});
//     } else{
//       return res.json({ success:false });
//     }
//    }catch (err) {
//     console.log("Chat delete error", err);
//     return res.json({ msg: err || config.DEFAULT_RES_ERROR });
//   }
//    };

const SENDMESSAGE_MAIL_CHAT = async (req, res) => {
  try {
    const { messageData, chatRoomId, caseName, groupName, membersEmail } = req.body;
    const docName = `${caseName}-${groupName}-${moment(Date.now()).format("DD-MM-YY HH:mm")}`;
    // doc.save(docName)
    // Use map to send emails to each member's email address
    const mailPromises = membersEmail.map(async (email) => {
      const mailOptions = {
        to: email,
        subject: "Chat Messages",
        html: `<p>New Messages for + ${docName}</p>${messageData} <p>`,
        // attachments: [
        //   {
        //     filename: `${docName}.pdf`,
        //     content: doc.output(),
        //   },
        // ],
      };
      return sendMail(mailOptions);
    });
    // Wait for all emails to be sent
    const mailResults = await Promise.all(mailPromises);
    res.json({ success: true, mailResults });
  } catch (err) {
    return res.json({ msg: err || config.DEFAULT_RES_ERROR });
  }
};

module.exports.messageController = {
  SENDMESSAGE,
  GETMESSAGES,
  GETFILES,
  REPLYMESSAGE,
  GETMESSAGEBYID,
  DELETEMSG,
  MAIL_CHAT,
  GETSENDERBYNAMEID,
  GETGROUPBYNAMEID,
  PINNEDMESSAGE,
  UNPINNEDMESSAGE,
  FILENOTES,
  GETPINMESSAGES,
  UPDATE_MESSAGE,
  SENDMESSAGE_MAIL_CHAT,
  // DELETE_CHAT
};

const axios = require("axios");
const { google } = require("googleapis");
const config = require("../config");
require("dotenv").config();
const Group = require("../models/Group");
const Message = require("../models/Message");
const GridFSUploader = require("../helpers/GridFSUploader");
const { default: mongoose } = require("mongoose");

const mimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/docx",
];

const oAuth2Client = new google.auth.OAuth2(
  config.MAIL_CLIENT_ID,
  config.MAIL_CLIENT_SECRET,
  config.MAIL_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: config.MAIL_REFRESH_TOKEN,
});

const generateConfig = (url, accessToken) => {
  return {
    method: "get",
    url: url,
    headers: {
      Authorization: `Bearer ${accessToken} `,
      // "Content-type": "application/json"
    },
  };
};

async function getUser(req, res) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
}

async function getDrafts(req, res) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.log(error?.name);
    console.log(error?.response?.data?.error?.errors);
    console.log(error?.response?.status);
    // console.log(error?.response?.headers);
    // return error;
    res.send(error);
  }
}

async function searchMail(req, res) {
  try {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=@gmail.com is:UNREAD&INBOX`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);

    let sendMessages = [];

    if (response?.data?.messages?.length > 0) {
      Promise.all(
        response?.data?.messages?.map(async (mailMes) => {
          const readMailURL = `https://gmail.googleapis.com//gmail/v1/users/me/messages/${mailMes?.id}`;
          const readMailConfig = generateConfig(readMailURL, token);
          const readMailResponse = await axios(readMailConfig);
          const messsageData = readMailResponse.data;
          const { payload } = messsageData;
          let validMessageData = "";
          let validAttachments = [];
          let parts = [payload];

          const subject = payload?.headers.find(
            (h) => h?.name === "Subject"
          )?.value;
          const mail = messsageData?.snippet;

          const emailIdMatch = mail.match(/\[Thread Id:\s*([^\]]+)\]/);
          const mailId = emailIdMatch?.[1] ?? "EmailId not found in snippet";
          const senderEmail = payload?.headers
            .find((h) => h?.name === "From")
            ?.value?.match(/[^@<\s]+@[^@\s>]+/)[0];

          const group = await Group.findOne({ threadId: mailId }).populate({
            path: "groupMembers.id",
            select: "email",
          });
          const groupId = group?._id;

          const handleDocUpload = async ({
            fileName,
            mailId,
            attachmentId,
            contentType,
          }) => {
            const attachmentURL = `https://gmail.googleapis.com//gmail/v1/users/me/messages/${mailId}/attachments/${attachmentId}`;
            const attachmentConfig = generateConfig(attachmentURL, token);
            const attachmentResponse = await axios(attachmentConfig);
            const attID = await GridFSUploader({
              data: attachmentResponse?.data?.data,
              fileName,
              contentType,
            });
            validAttachments.push({
              type: contentType,
              id: attID,
              name: fileName,
              aflag: true,
            });
          };

          if (group) {
            while (parts.length) {
              let part = parts.shift();
              if (part.parts) {
                parts = parts.concat(part.parts);
              }

              if (part.mimeType === "text/html" && validMessageData === "") {
                validMessageData =
                  `<strong>Subject: ${subject}</strong><br><br>` +
                  Buffer.from(part?.body?.data, "base64").toString();
              }

              if (mimeTypes.includes(part?.mimeType)) {
                await handleDocUpload({
                  fileName: part?.filename || "mail document",
                  mailId: mailMes?.id,
                  attachmentId: part?.body?.attachmentId,
                  contentType: part?.mimeType,
                });
              }
            }
            if (group?.threadIdCondition === "EveryOne") {
              const sender = group?.groupMembers?.find(
                (g) => g?.id?.email === senderEmail
              )?.id?._id;
              const receivers = group?.groupMembers
                ?.filter((gm) => gm?.id?.email !== senderEmail)
                ?.map((g) => g?.id?._id);

              const messageQuery = {
                groupId,
                sender,
                receivers,
                messageData: validMessageData,
              };

              if (group.caseId) {
                messageQuery.caseId = group.caseId;
              }

              if (validAttachments?.length > 0) {
                messageQuery.isAttachment = true;
                messageQuery.attachments = validAttachments;
              }

              const createdMessage = await Message.create(messageQuery);
              if (createdMessage) {
                const { token: accessToken } =
                  await oAuth2Client.getAccessToken();
                await axios({
                  method: "post",
                  url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${mailMes?.id}/modify`,
                  headers: {
                    Authorization: `Bearer ${accessToken} `,
                  },
                  data: {
                    addLabelIds: ["Label_2117604939096943395"],
                    removeLabelIds: ["UNREAD"],
                  },
                });

                sendMessages.push(createdMessage);
              } else {
                console.log({
                  msg: "Failed to forward mail",
                  groupId,
                  data: response.data,
                });
              }
            } else {
              console.log({
                msg: "No group found ",
                groupId,
              });
            }
          }

          const sender = group?.groupMembers?.find(
            (g) => g?.id?.email === senderEmail
          )?.id?._id;
          const receivers = group?.groupMembers
            ?.filter((gm) => gm?.id?.email !== senderEmail)
            ?.map((g) => g?.id?._id);
          if (sender && group?.threadIdCondition === "GroupMembers") {
            const messageQuery = {
              groupId,
              sender,
              receivers,
              messageData: validMessageData,
            };

            if (group.caseId) {
              messageQuery.caseId = group.caseId;
            }

            if (validAttachments?.length > 0) {
              messageQuery.isAttachment = true;
              messageQuery.attachments = validAttachments;
            }

            const createdMessage = await Message.create(messageQuery);
            if (createdMessage) {
              const { token: accessToken } =
                await oAuth2Client.getAccessToken();
              await axios({
                method: "post",
                url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${mailMes?.id}/modify`,
                headers: {
                  Authorization: `Bearer ${accessToken} `,
                },
                data: {
                  addLabelIds: ["Label_2117604939096943395"],
                  removeLabelIds: ["UNREAD"],
                },
              });

              sendMessages.push(createdMessage);
            } else {
              console.log({
                msg: "Failed to forward mail",
                groupId,
                data: response.data,
              });
            }
          } else {
            console.log({
              msg: "No group found ",
              groupId,
            });
          }
        })
      ).then(() => {
        console.log("successfully uploaded mail data : ", sendMessages);
        // return res.json({ success: true, sendMessages });
      });
    } else {
      console.log("no data found");
      // return res.json({ msg: "No data found" });
    }
  } catch (error) {
    console.log("error : " + error);

    // return res.json({ error });
  }
}

setInterval(searchMail, 6000);

// async function searchMail(req, res) {
//   try {
//     const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=RCID is:UNREAD&INBOX`;
//     const { token } = await oAuth2Client.getAccessToken();
//     const config = generateConfig(url, token);
//     const response = await axios(config);
//     const readMailURL = `https://gmail.googleapis.com//gmail/v1/users/me/messages/184d245fd7785b7c/attachments/ANGjdJ--CLKZRuWP_WXTAMBOOqQi5OBjD6Q7Fmn0z2yjfRZ38nw5uwnDXfGURO1f6mTyDR4mZ_76vgudj0Z2gKlNDt0VIfJ4mHwgLZJTCkG1SRswPlYha3vMG_eeKE2zA4qxk4rdwoVzm37PUip7sC6fr-gNVrY7vnLhUtuDaByi3tH4Di9AuxQV2tXzewAARK5o_hN_HIMA3IpUgs0XoETy_SUakJYdCxmJr0_Cg6gji8tsaKKyXRbk4JkJFScSV5QJpOXIaiXVrJS6HPq_wsKpqU39PPwm6Wkbr0qwYqTuaBd0Rh29DISJAEDvTipwhnO2LHuaguyBXKAS4X0R0B1VwR_Q7u3xDqz-xCf27vYu2p1UyOoAR5pTdQZA_eDAAx6McobFrwZJwF-G-iDh`;
//     const readMailConfig = generateConfig(readMailURL, token);
//     const readMailResponse = await axios(readMailConfig);
//     const messsageData = readMailResponse.data.data;
//     GridFSUploader({
//       data: messsageData,
//       fileName: "image.img",
//       contentType: "img",
//     });
//     // const { payload } = messsageData;
//     // let parts = [payload];
//     // while (parts.length) {
//     //   let part = parts.shift();
//     //   if (part.parts) {
//     //     parts = parts.concat(part.parts);
//     //   }
//     //   if (part.mimeType === "application/pdf") {
//     //     console.log();
//     //   }
//     // }
//     return res.json({ readMailResponse: messsageData });
//   } catch (error) {
//     res.json({ msg: error.message });
//   }
// }

async function readMail(req, res) {
  try {
    const url = `https://gmail.googleapis.com//gmail/v1/users/me/messages/${req.params.messageId}`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    let data = await response.data;
    res.json(data);
  } catch (error) {
    res.send(error);
  }
}

// async function searchMail(req, res, next) {
//   try {
//     // const url = `https://gmail.googleapis.com//gmail/v1/users/me/messages/184c8525a5e366b9/attachments/ANGjdJ-l28Zgo_oHD0uPY5YQw9JJMxYkXCTOjIiLvExumpp-MofFJnZGbF59g6kS6wmUibciXLv10XLnR0mCE_4NhvYcPI0VVsthJnps0aI-TiQAs-CMLx5Ecmir_OmInd8YfayxCFKCVOROPby5iJVa4EArDHmwVMOj9lUxo-dpB9IhJlRgn7CCngL18lwFP5qtVTLkcLBUuoRMVuRIS3ch7Ow1Sxvtuyg3zSNcui87Afbow6A7rsKpyPKEuMHFIq5EPiP-PQIbI2RAg9EEvPXisC-FN-8l7zpMr8rf-gIIgR4q8AAN33PQOecNhfb1QhWCZ7POi-w0IGZiVdVIQU25WAbvHXjE167DKZAfkDANomPKIWzuzTx7GEXgyzF1129I9fgOT4gzTPwfYZqM`;
//     const url = `https://gmail.googleapis.com//gmail/v1/users/me/messages/184d241762b0ce2a`;
//     const { token } = await oAuth2Client.getAccessToken();
//     const config = generateConfig(url, token);
//     const response = await axios(config);
//     return res.json({ success: true, response: response?.data });
//     let base64 = response?.data?.data.replace(/_/g, "/");
//     base64 = base64.replace(/-/g, "+");
//     const buffer = Buffer.from(base64, "base64");
//     Stream.push(buffer);
//     Stream.push(null);
//     const uploadRes = Stream.pipe(
//       gfs.openUploadStream("gmail.pdf", { contentType: "application/pdf" })
//     );

//     return res.json({ readMailResponse: uploadRes?.id });
//   } catch (error) {
//     console.log("Multer Error 2: " + error);

//     res.json({ msg: error.message });
//   }
// }

module.exports.mailReplyController = {
  getUser,
  getDrafts,
  searchMail,
  readMail,
};

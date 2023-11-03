const { Router } = require("express");
const { messageController } = require("../controllers/messageController");
const router = Router();

router.get("", (req, res) => res.send("Message route"));

router.post("/send", messageController.SENDMESSAGE);
router.post("/reply", messageController.REPLYMESSAGE);
router.post("/get", messageController.GETMESSAGES);
router.post("/getFiles", messageController.GETFILES);
router.post("/getmsgById", messageController.GETMESSAGEBYID);
router.post("/deletemsg", messageController.DELETEMSG);
router.post("/mailChat", messageController.MAIL_CHAT);
router.post("/getsendernameById", messageController.GETSENDERBYNAMEID);
router.post("/getgroupnameById", messageController.GETGROUPBYNAMEID);
router.post("/pinnedmsgById", messageController.PINNEDMESSAGE);
router.post("/unpinnedmsgById", messageController.UNPINNEDMESSAGE);
router.post("/notes", messageController.FILENOTES);
router.post("/getPinnedMsg", messageController.GETPINMESSAGES);
router.post("/updateMsg", messageController.UPDATE_MESSAGE);
router.post("/sendmessagemail", messageController.SENDMESSAGE_MAIL_CHAT);


module.exports = router;

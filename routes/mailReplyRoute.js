const { Router } = require("express");
const { mailReplyController } = require("../controllers/mailReplyController");
const router = Router();

router.get("", (req, res) => res.send("Mail Reply route"));

router.get("/searchMail/:search", mailReplyController.searchMail);

module.exports = router;

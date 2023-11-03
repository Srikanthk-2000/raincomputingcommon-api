const { Router } = require("express");
const { groupController } = require("../controllers/groupController");
const router = Router();

router.get("", (req, res) => res.send("Group Route"));

router.post("/createGroup", groupController.CREATE_GROUP);

router.post("/getByUserandCaseId", groupController.GETBYCASEID_USERID);

router.post("/createChat", groupController.CREATE_ONE_ON_ONE_CHAT);

router.post("/getChat", groupController.GET_ONE_ON_ONE_CHAT);

router.post("/updateGroup", groupController.UPDATE_GROUP);


module.exports = router;

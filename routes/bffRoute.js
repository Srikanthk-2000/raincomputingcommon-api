const { Router } = require("express");
const { bffController } = require("../controllers/bffController");
const router = Router();
router.get("", (req, res) => res.send("Bff Route"));
router.post("/getCounts", bffController.GET_COUNT);

module.exports = router;

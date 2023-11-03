const express = require("express");
const { reject } = require("lodash");
const jwt = require("jsonwebtoken");
const { hashGenerator } = require("../helpers/Hashing");
const { hashValidator } = require("../helpers/Hashing");
const { JWTtokenGenerator } = require("../helpers/token");
const ActiveSessionModel = require("../models/activeSession");
const { isAuthenticated } = require("../helpers/safeRoutes");
const FirmModel = require("../models/FirmModel");
const RegAttorneyModel = require("../models/RegAttorneyModel");
const userModel = require("../models/userModel");
const Case = require("../models/Case");
const PaymentModel = require("../models/PaymentModel");
const router = express.Router();

router.get("/", (req, res) => res.send(" Admin Route"));

router.post("/adminRegister", async (req, res) => {
  const { firstname, lastname,email, password } = req.body;
  // console.log(req.body, "req.body");
  if (!password) {
    return res.json({
      msg: "Password Empty",
    });
  }
  userModel.findOne({ firstname: firstname, admin: true }, async (err, isAdmin) => {
    if (err) {
      return res.json({
        msg: "Admin Registeration failed",
        error: err,
      });
    } else if (isAdmin) {
      if (!isAdmin.aflag) {
        return res.json({
          msg: "This account has been deactivated",
        });
      } else {
        console.log("Alre");

        return res.json({
          msg: "Admin Already Exist",
        });
      }
    } else {
      console.log("AdminRegister");
      const hashPassword = await hashGenerator(password);
      const queryData = {
        firstname: firstname,
        lastname: lastname,
        // adminName: adminName,
        email: email,
        password: hashPassword,
        aflag: true,
        admin:true,
      };
      userModel.create(queryData, async (err, admin) => {
        if (err) {
          return res.json({
            msg: "Admin Registeration failed",
            error: err,
          });
        } else {
          return res.json({
            success: true,
            msg: "Admin Registration Sucessfull ",
            adminID: admin._id,
          });
        }
      });
    }
  });
});

router.post("/adminLogin", async (req, res) => {
  const { firstname, password } = req.body;

  userModel.findOne({ firstname: firstname, admin: true }, async (err, isAdmin) => {
    if (err) {
      return res.json({
        msg: "Login failed",
        error: err,
      });
    } else if (!isAdmin) {
      return res.json({
        msg: "This  username isn't registered yet",
      });
    } else if (!isAdmin.aflag) {
      return res.json({
        msg: "This account has been deactivated",
      });
    } else {
      const result = await hashValidator(password, isAdmin.password);
      if (result) {
        console.log(result, "result");
        const jwtToken = await JWTtokenGenerator({
          id: isAdmin._id,
          expire: "30d",
        });
        const query = {
          adminId: isAdmin._id,
          firstname: isAdmin.firstname,
          lastname: isAdmin.lastname,
          aflag: true,
          admin: true,
          token: "JWT " + jwtToken,
        };
        res.cookie("jwt", jwtToken, {
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        console.log("Setting cookie in res");
        return res.json({
          success: true,
          adminID: isAdmin._id,
          firstname: isAdmin.firstname,
          lastname: isAdmin.lastname,
          // username: isAdmin.username,
          token: "JWT " + jwtToken,
          admin: true,
        });
      } else {
        return res.json({
          msg: "Password Doesn't match",
        });
      }
    }
  });
});

router.get("/signOut", async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    maxAge: 1,
  });
  return res.json({ success: true });
});

router.get("/allUsersList", async (req, res) => {
  userModel.find((err, list) => {
    if (err) {
      res.json({
        msg: err,
      });
    } else {
      res.json({
        success: true,
        users: list,
      });
    }
  });
});

router.get("/allAttorneysList", async (req, res) => {
  RegAttorneyModel.find({})
    .populate({
      path: "regUser",
      select: "firstname lastname email",
    })
    .exec((err, list) => {
      if (err) {
        res.json({
          msg: err,
        });
      } else {
        res.json({
          success: true,
          attorneys: list,
        });
      }
    });
});

router.get("/allFirmsList", async (req, res) => {
  FirmModel.find((err, list) => {
    if (err) {
      res.json({
        msg: err,
      });
    } else {
      res.json({
        success: true,
        firms: list,
      });
    }
  });
});

router.put("/removeUser", async (req, res) => {
  const { userID } = req.body;
  const removeUser = await userModel.findByIdAndUpdate(userID, {
    aflag: false,
    lastModified: Date.now(),
  });
  if (!removeUser) {
    res.status(404);
  } else {
    res.json({ success: true, removeUser });
  }
});

router.put("/removeAttorney", async (req, res) => {
  try {
    const { regUser } = req.body;
    const removeAttorney = await RegAttorneyModel.findByIdAndUpdate(regUser, {
      aflag: false,
      status: "rejected",
      lastModified: Date.now(),
    });
    const userID = removeAttorney.regUser.toString().substr(0, 38);

    const removeUser = await userModel.findByIdAndUpdate(userID, {
      attorneyStatus: "rejected",
      lastModified: Date.now(),
    });
    if (!removeUser) {
      res.status(404);
    } else {
      res.json({ success: true, removeAttorney });
    }
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
});

router.put("/attorneyStatus", async (req, res) => {
  try {
    const { attorneyID, status } = req.body;
    const updatedAttorney = await RegAttorneyModel.findByIdAndUpdate(
      attorneyID,
      {
        status: status,
        lastModified: Date.now(),
      }
    );
    const userID = updatedAttorney.regUser.toString().substr(0, 38);

    const UpdateUser = await userModel.findByIdAndUpdate(userID, {
      attorneyStatus: status,
      lastModified: Date.now(),
    });
    {
      if (UpdateUser) {
        res.json({
          success: true,
          status: "success",
        });
      } else {
        return res.json({
          status: "rejected",
          msg: "Attorney Registration is Rejected",
        });
      }
    }
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
});

router.get("/allReqAttorneyList", async (req, res) => {
  RegAttorneyModel.find({ status: "requested" })
    .populate({
      path: "regUser",
      select: "firstname lastname email",
    })
    .exec((err, list) => {
      if (err) {
        res.json({
          msg: err,
        });
      } else {
        res.json({
          success: true,
          reqAttorney: list,
        });
      }
    });
});

router.post("/getUserById", async (req, res) => {
  try {
    const { userId } = req.body;
    userModel.findById(userId, async (err, User) => {
      if (err) {
        return res.json({
          msg: err,
        });
      } else if (User) {
        return res.json({
          success: true,
          User,
        });
      } else {
        return res.json({
          msg: `No User Found With Id ${userId}`,
        });
      }
    });
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
});

router.get("/allPaymentDetails", async (req, res) => {
  try {
    PaymentModel.find()
      .populate({
        path: "consumerId",
        select: "firstname lastname ",
      })
      .populate({
        path: "attorneyId",
        populate: { path: "regUser", select: "firstname lastname" },
      })
      .exec((err, data) => {
        if (err) {
          return res.json({
            msg: err,
          });
        } else {
          return res.json({
            success: true,
            paymentIntent: data,
          });
        }
      });
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
});

router.get("/allCaseDetails", async (req, res) => {
  Case.find({})
    .populate([
      {
        path: "caseMembers",
        select: "addedBy",
      },
    ])
    .exec((err, list) => {
      if (err) {
        res.json({
          msg: err,
        });
      } else {
        res.json({
          success: true,
          cases: list,
        });
      }
    });
});
// router.post("/getCaseById", async (req, res) => {
//   try {
//     const { caseid } = req.body;
//     Case.findById(caseid, async (err, cases) => {
//       if (err) {
//         return res.json({
//           msg: err,
//         });
//       } else if (cases) {
//         return res.json({
//           success: true,
//           cases,
//         });
//       } else {
//         return res.json({
//           msg: `No Case Found With Id ${caseid}`,
//         });
//       }
//     });
//     console.log(res);
//   } catch (err) {
//     return res.json({
//       msg: err,
//     });
//   }
// });
router.post("/getCaseById", async (req, res) => {
  try {
    const { caseid } = req.body;
    Case.findOne({ _id: caseid })
      .populate({
        path: "caseMembers",
        // select: "firstname lastname email",
        populate: { path: "id", select: "firstname lastname email" },
      })
      .exec((err, cases) => {
        if (err) {
          return res.json({
            msg: err,
          });
        } else if (cases) {
          return res.json({
            success: true,
            cases,
          });
        } else {
          return res.json({
            msg: `No firm found with id ${caseid}`,
          });
        }
      });
  } catch (err) {
    return res.json({
      msg: err,
    });
  }
});
module.exports = router;

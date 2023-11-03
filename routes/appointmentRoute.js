const express = require("express");

const router = require("./userRoute");
const UserModel = require("../models/userModel");
const AppointmentModel = require("../models/AppointmentModel");

router.get("/", (req, res) => res.send(" Attorney Route"));

router.post("/appointmentrequest", async (req, res) => {
  try {
    const { User, attorney, caseData, isAttachments,
      attachments,appointmentstatus } = req.body;
    const user = await UserModel.findOne({ _id: User, aflag: true });
    if (user) {
      const appointmentReqQuery = {
        User: user,
        attorney: attorney,
        caseData,
        isAttachments,
        attachments,
        appointmentstatus,
      };
      const isAlreadyReqAppointment = await AppointmentModel.find({
        attorney,
        User,
      });
      if (isAlreadyReqAppointment.length > 0) {
        return res.json({
          msg: `you have already send appointment reqest to ${attorney}`,
        });
      } else {
        const appointmentRequest = await AppointmentModel.create(
          appointmentReqQuery
        );

        if (appointmentRequest) {
          const updatedUser = await UserModel.findByIdAndUpdate(User, {
            appointmentStatus: appointmentstatus,

            lastModified: Date.now(),
          });
          if (updatedUser) {
            return res.json({
              success: true,
              userID: updatedUser._id,
              firstname: updatedUser.firstname,
              lastname: updatedUser.lastname,
              email: updatedUser.email,
              appointmentStatus: appointmentstatus,
              profilePic: updatedUser.profilePic,
            });
          } else {
            return res.json({
              msg: "Appointment reqest send successfully ",
            });
          }
        } else {
          return res.json({ msg: "Appointment reqest failed" });
        }
      }
    } else {
      return res.json({ msg: "User not found" });
    }
  } catch (err) {
    return res.json({
      msg: err?.name || err,
    });
  }
});

router.post("/getAllAppointmentRequestByUserId", async (req, res) => {
  try {
    const { userID } = req.body;
    AppointmentModel.find({ attorney: userID })
      .populate({
        path: "User",
        select: "firstname lastname email casedata attachments status attorney",
      })
      .exec((err, isAppointment) => {
        if (err) {
          return res.json({
            msg: err,
          });
        } else {
          return res.json({
            success: true,
            appointment: isAppointment,
          });
        }
      });
  } catch (err) {
    return res.json({ msg: "error" });
  }
});

router.put("/appointmentStatus", async (req, res) => {
  try {
    const { appointmentID, appointmentstatus } = req.body;
    const updatedApponitment = await AppointmentModel.findByIdAndUpdate(
      appointmentID,
      {
        appointmentstatus: appointmentstatus,
        lastModified: Date.now(),
      }
    );

    if (updatedApponitment) {
      res.json({
        success: true,
        status: "success",
      });
    }
  } catch (err) {
    console.log("att err:", err);
    return res.json({
      msg: err,
    });
  }
});

router.post("/getAppointmentStatusById", async (req,res) => {
  try{
  const {userID} = req.body;
  AppointmentModel.find({User : userID })
  .populate({
    path : "attorney",
    populate : {path : "regUser" ,select: "firstname lastname profilePic "},
  })
  .exec((err, list) => {
    if (err){
      return res.json({
        msg : err,
      });
    }else {
      return res.json ({
        success : true,
        list, 
      });
    }
  })
}catch (err) {
  return res.json({ msg: "error" });
}
})

module.exports = router;

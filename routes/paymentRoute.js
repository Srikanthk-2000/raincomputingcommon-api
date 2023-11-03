const express = require("express");
const { identity } = require("lodash");
const PaymentModel = require("../models/PaymentModel");
const router = express.Router();
const stripe = require("stripe")(
  "sk_test_51LYOZnSED7zxlOa8JJRGqPgogYBn0hw5geNTfpbNBlxT6JXyyUtU14QyB2qv1EZAwvC0Fw3NjugyNkk3zINBj2xh00pqSKN7nc"
);

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 20000;
};

router.get("/", (req, res) => res.send(" Payment Route"));

router.post("/create-payment-intent", async (req, res) => {
  const { items, email, user, attorney } = req.body;
  console.log("currentUser", user);

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    customer: "cus_MIciUgEizHmKkS",
    metadata: {
      email: email,
      user: user,
      attorney: attorney,
    },
    description: "Paying in USD",
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

router.post("/getPaymentId", async (req, res) => {
  try {
    const { pi } = req.body;
    const isPaymentExist = await PaymentModel.findOne({ transactionId: pi });
    if (isPaymentExist) {
      return res.json({ success: true, isPaymentExist });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(pi);
    // console.log("paymentIntent:", paymentIntent);
    if (paymentIntent) {
      const { metadata, status, amount } = paymentIntent;
      const paymentQuery = {
        consumerId: metadata?.user,
        attorneyId: metadata?.attorney,
        payAmount: amount / 100,
        paymentStatus: status,
        transactionId: pi,
      };
      const paymentRes = await PaymentModel.create(paymentQuery);
      if (paymentRes) {
        return res.json({ success: true, paymentRes });
      }
    }
  } catch (err) {
    res.json({
      msg: err,
    });
  }
});

module.exports = router;

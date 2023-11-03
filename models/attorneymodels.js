const mongoose = require("mongoose");
const attorneySchema = mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },

  address1: {
    type: String,
    required: true,
  },
  address2: {
    type: String,
    required: true,
  },

  city: {
    type: String,
    required: true,
  },
  firm: {
    type: String,
    required: true,
  },
  City: {
    type: String,
    required: true,
  },
  initials: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  registernumber: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  zipcode: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("attorneymodels", attorneySchema);

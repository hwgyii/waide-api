const mongoose = require("mongoose");

const { TABLE_AVAILABILITY } = require("../common/constants");

const TABLE_SCHEMA = new mongoose.Schema({
  establishment: { type: mongoose.ObjectId, required: true, ref: "Establishments" },
  name: { type: String, required: true },
  availability: { type: Number, required: true, default: TABLE_AVAILABILITY.AVAILABLE },
  currentToken: { type: String, unique: true, },
  passcode: { type: String, },
  sales: [{ type: mongoose.ObjectId, ref: "Sales" }],
  totalPrice: { type: Number, required: true, default: 0 },
  archived: { type: Boolean, required: true, default: false },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Tables", TABLE_SCHEMA);
const mongoose = require('mongoose');

const DELIVERY_SCHEMA = new mongoose.Schema({
  user: { type: mongoose.ObjectId, required: true, ref: "User" },
  sales: { type: mongoose.ObjectId, required: true, ref: "Sales" },
  establishment: { type: mongoose.ObjectId, required: true, ref: "Establishment" },
  address: { type: String, required: true },
  archived: { type: Boolean, required: true, default: false },
}, {timestamps: true, versionKey: false});

module.exports = mongoose.model("deliveries", DELIVERY_SCHEMA);
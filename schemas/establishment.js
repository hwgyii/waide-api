const mongoose = require('mongoose');

const ESTABLISHMENT_SCHEMA = new mongoose.Schema({
  user: { type: mongoose.ObjectId, required: true, ref: "Users" },
  name: { type: String, required: true, unique: true },
  logo: { type: String },
  address: { type: String, required: true, },
  type: { type: Number, },// add default value },
  operatingHours: { type: String, },
  archived: { type: Boolean, required: true, default: false },
  settings: { type: mongoose.ObjectId, ref: "EstablishmentSettings", required: true, },
}, {timestamps: true, versionKey: false});

module.exports = mongoose.model("Establishments", ESTABLISHMENT_SCHEMA);
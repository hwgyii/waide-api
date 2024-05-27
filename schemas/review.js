const mongoose = require('mongoose');

const REVIEW_SCHEMA = new mongoose.Schema({
  user: { type: mongoose.ObjectId, required: true, ref: "User" },
  establishment: { type: mongoose.ObjectId, required: true, ref: "Establishment" },
  review: { type: String, required: true },
  rating: { type: Number, required: true },
  archived: { type: Boolean, required: true, default: false },
}, {timestamps: true, versionKey: false});

module.exports = mongoose.model("Reviews", REVIEW_SCHEMA);
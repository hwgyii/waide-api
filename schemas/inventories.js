const mongoose = require("mongoose");

const INVENTORIES_SCHEMA = new mongoose.Schema({
  establishment: { type: mongoose.ObjectId, required: true, ref: "Establishments" },
  name: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  archived: { type: Boolean, required: true, default: false },
  photo: { type: String },
  type: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Inventories", INVENTORIES_SCHEMA);
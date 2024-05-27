const mongoose = require('mongoose');

const SALES_SCHEMA = new mongoose.Schema({
  establishment: { type: mongoose.ObjectId, required: true, ref: "Establishments" },
  items: [{ type: mongoose.ObjectId, required: true, ref: "InventorySales" }],
  description: { type: String },
  totalPrice: { type: Number, required: true },
  isCompleted: { type: Boolean, required: true, default: false },
  table: { type: mongoose.ObjectId, ref: "Tables" },
  archived: { type: Boolean, required: true, default: false }, 
}, {timestamps: true, versionKey: false});

module.exports = mongoose.model("Sales", SALES_SCHEMA);
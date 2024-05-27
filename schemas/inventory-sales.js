const mongoose = require('mongoose');

const INVENTORY_SALES_SCHEMA = new mongoose.Schema({
  item: { type: mongoose.ObjectId, required: true, ref: "Inventories" },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, {timestamps: true, versionKey: false});

module.exports = mongoose.model("InventorySales", INVENTORY_SALES_SCHEMA);
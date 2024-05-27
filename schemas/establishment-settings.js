const mongoose = require('mongoose');

const ESTABLISHMENT_SETTINGS_SCHEMA = new mongoose.Schema({
  tablesEnabled: { type: Boolean, required: true, default: true },
  deliveryEnabled: { type: Boolean, required: true, default: true },
  inventoryEnabled: { type: Boolean, required: true, default: true },
  invoiceEnabled: { type: Boolean, required: true, default: true },
  preparationEnabled: { type: Boolean, required: true, default: true },
  isOpen: { type: Boolean, required: true, default: true },
  archived: { type: Boolean, required: true, default: false },
}, {timestamps: true, versionKey: false});

ESTABLISHMENT_SETTINGS_SCHEMA.index({ establishment: 1, archived: 1 });

module.exports = mongoose.model("EstablishmentSettings", ESTABLISHMENT_SETTINGS_SCHEMA);
const mongoose = require('mongoose');
const { ROLES } = require('../common/constants');

const USER_SCHEMA = new mongoose.Schema({
  email: { type: String, required: true, unique: true, select: true, index: true },
  password: { type: String, required: true, select: false },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fullName: { type: String },
  authToken: { type: String, select: false },
  role: { type: Number, required: true, default: ROLES.UNVERIFIED },
  archived: { type: Boolean, required: true, default: false },
  expoToken: { type: String },
}, {timestamps: true, versionKey: false});

USER_SCHEMA.index({ email: 1, authToken: 1 });

module.exports = mongoose.model("Users", USER_SCHEMA);
const express = require("express");
const router = express.Router();
const { isEmpty, get } = require("lodash");

const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages.js");
const { verifySessionToken, limitMinimumAccessTo } = require("../utilities/middlewares/users.js");
const { ROLES } = require("../common/constants");
const INVENTORY = require("../schemas/inventories.js");
const ESTABLISHMENT = require("../schemas/establishment.js");

router.get("/invoices/me", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const inventories = await INVENTORY.find({ establishment: establishment._id, type: 1, archived: false });

    return res.status(HTTP_CODES.SUCCESS).json({
      inventories
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { isEmpty, get } = require("lodash");

const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages.js");
const { validateFields } = require("../utilities/services/validation.js");
const { hashPassword } = require("../utilities/services/users.js");
const { verifySessionToken, limitMinimumAccessTo } = require("../utilities/middlewares/users.js");
const { ROLES } = require("../common/constants");

const USER = require("../schemas/user.js");
const ESTABLISHMENT = require("../schemas/establishment.js");
const ESTABLISHMENT_SETTINGS = require("../schemas/establishment-settings.js");
const TABLE = require("../schemas/table.js");
const INVENTORY = require("../schemas/inventories.js");
const REVIEW = require("../schemas/review.js");
const SALES = require("../schemas/sales.js");
const dayjs = require("dayjs");

router.get("/reports/gross-sales", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {
    const { query } = req;

    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    const quartersStartDate = {
      '1': dayjs(`${dayjs().year()}-01-01`).startOf("month"),
      '2': dayjs(`${dayjs().year()}-04-01`).startOf("month"),
      '3': dayjs(`${dayjs().year()}-07-01`).startOf("month"),
      '4': dayjs(`${dayjs().year()}-10-01`).startOf("month"),
    };

    const quartersEndDate = {
      '1': dayjs(`${dayjs().year()}-03-31`).endOf("month"),
      '2': dayjs(`${dayjs().year()}-06-30`).endOf("month"),
      '3': dayjs(`${dayjs().year()}-09-30`).endOf("month"),
      '4': dayjs(`${dayjs().year()}-12-31`).endOf("month"),
    };

    const findOptions = {
      $and: [
        { "createdAt": { $gte: quartersStartDate[query.quarter] } },
        { "createdAt": { $lte: quartersEndDate[query.quarter] } },
        { establishment: establishment._id },
        { archived: false }
      ],
    };

    const sales = await SALES.find(findOptions);

    const totalSales = sales.reduce((acc, sale) => {
      return acc+ sale.totalPrice;
    }, 0).toFixed(2);


    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Success",
      totalSales,
    });
  } catch (error) {
    console.error("Error in /reports/gross-sales: ", error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({ message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

module.exports = router;
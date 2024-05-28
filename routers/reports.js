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
const { createSalesReport, createInventoryReport } = require("../utilities/pdfmaking/pdf.js");

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
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/reports/establishment/sales", async (req, res) => {
  try {
    const { to, from, establishmentId } = req.query;

    const establishment = await ESTABLISHMENT.findOne({ _id: establishmentId, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.NOT_FOUND).json({
        message: "Establishment not found"
      });
    }

    const findOptions = {
      $and: [
        { "createdAt": { $gte: dayjs(from).startOf("day") } },
        { "createdAt": { $lte: dayjs(to).endOf("day") } },
        { establishment: establishment._id },
        { archived: false }
      ],
    };

    const sales = await SALES.find(findOptions);

    const totalSales = sales.reduce((acc, sale) => {
      return acc+ sale.totalPrice;
    }, 0).toFixed(2);

    const date = { from: dayjs(from).format("DD/MM/YYYY"), to: dayjs(to).format("DD/MM/YYYY") };
    const establishmentData = { name: establishment.name, address: establishment.address };
    const tableHeader = ["number", "date", "salesId", "totalPrice"];
    const tableData = sales.map((sale, index) => {
      return {
        number: index + 1,
        date: dayjs(sale.createdAt).format("DD/MM/YYYY"),
        salesId: sale._id.toString().slice(-10),
        totalPrice: sale.totalPrice.toFixed(2),
      };
    });

    createSalesReport(req, res, `${establishment.name}'s Sales Report`, establishmentData, date, tableHeader, tableData, totalSales);
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/reports/establishment/inventory", async (req, res) => {
  try {
    const { establishmentId } = req.query;

    const establishment = await ESTABLISHMENT.findOne({ _id: establishmentId, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.NOT_FOUND).json({
        message: "Establishment not found"
      });
    }

    const inventories = await INVENTORY.find({ establishment: establishment._id, archived: false });

    const establishmentData = { name: establishment.name, address: establishment.address };
    const tableHeader = ["number", "name", "quantity", "price"];
    const tableData = inventories.map((inventory, index) => {
      return {
        number: index + 1,
        name: inventory.name,
        quantity: inventory.quantity,
        price: inventory.price.toFixed(2),
      };
    });

    createInventoryReport(req, res, `${establishment.name}'s Inventory Report`, establishmentData, dayjs().format("MMM DD, YYYY hh:mm A"), tableHeader, tableData);

  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
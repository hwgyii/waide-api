const express = require("express");
const router = express.Router();
const { isEmpty } = require("lodash");
const uniqid = require("uniqid");

const { verifySessionToken, limitMinimumAccessTo } = require("../utilities/middlewares/users");
const { ROLES, TABLE_AVAILABILITY } = require("../common/constants");
const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages");

const ESTABLISHMENT = require("../schemas/establishment");
const TABLE = require("../schemas/table");
const SALES = require("../schemas/sales");
const INVENTORY_SALES = require("../schemas/inventory-sales");
const INVENTORY = require("../schemas/inventories");
const ESTABLISHMENT_SETTINGS = require("../schemas/establishment-settings");

router.post("/tables/create", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { name } = req.body;

    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const table = await new TABLE({ name, establishment: establishment._id }).save();

    return res.status(HTTP_CODES.SUCCESS).json({
      message: `Table ${table.name} has been created.`,
      table
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

router.get("/tables/establishment", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const tables = await TABLE.find({ establishment: establishment._id, archived: false }).populate({
      path: "sales",
      model: SALES,
      populate: {
        path: 'items',
        model: INVENTORY_SALES,
        select: 'item quantity subtotal', // Select the ObjectId of the item
        populate: {
          path: 'item',
          model: INVENTORY,
          select: 'name' // Select only the name field of the Inventory model
        }
      }
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      tables
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

router.patch("/tables/establishment/update-availability/:tableId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { tableId } = req.params;
    const { availability } = req.body;

    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const table = await TABLE.findOne({ _id: tableId, establishment: establishment._id, archived: false });

    if (isEmpty(table)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_TABLE_FOUND
      });
    }

    let tableToUpdate;
    
    function generateSixDigitNumberAsString() {
      const min = 100000;
      const max = 999999;
      const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      return randomNumber.toString();
    }

    if (table.availability === TABLE_AVAILABILITY.OCCUPIED && availability === TABLE_AVAILABILITY.AVAILABLE) {
      const sales = await table.populate({
        path: "sales",
        model: SALES,
      });

      if (!isEmpty(sales.sales)) {
        let items = sales.sales.map(sale => sale.items);
        items = items.flat();
        if (items.length !== 0) {
          await new SALES({
            establishment: establishment._id,
            items,
            description: table.name,
            totalPrice: table.totalPrice,
            isCompleted: true
          }).save()
          
          await SALES.deleteMany({ _id: { $in: table.sales } }, { archived: true });
        }
      }

      tableToUpdate = await TABLE.findOneAndUpdate({ _id: tableId, establishment: establishment._id, archived: false }, { availability, currentToken: "", passcode: "", sales: [] }, { new: true });
    } else {
      tableToUpdate = await TABLE.findOneAndUpdate({ _id: tableId, establishment: establishment._id, archived: false }, { availability, passcode: availability === TABLE_AVAILABILITY.OCCUPIED ? generateSixDigitNumberAsString() : "", currentToken: availability === TABLE_AVAILABILITY.OCCUPIED ? uniqid().slice(-6) : ""  }, { new: true });
    }

    return res.status(HTTP_CODES.SUCCESS).json({
      message: `Changing availbility of table ${table.name} to ${availability} is successful.`,
      table: tableToUpdate
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

router.patch("/tables/:tableId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { tableId } = req.params;
    const { name } = req.body;

    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const table = await TABLE.findOne({ _id: tableId, establishment: establishment._id, archived: false });

    if (isEmpty(table)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_TABLE_FOUND
      });
    }

    const tableToUpdate = await TABLE.findOneAndUpdate({ _id: tableId, establishment: establishment._id, archived: false }, { name }, { new: true });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: `Table ${tableToUpdate.name} has been updated.`,
      table: tableToUpdate
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

router.delete("/tables/:tableId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { tableId } = req.params;

    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const table = await TABLE.findOne({ _id: tableId, establishment: establishment._id, archived: false });

    if (isEmpty(table)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_TABLE_FOUND
      });
    }

    const tableToDelete = await TABLE.findOneAndUpdate({ _id: tableId, establishment: establishment._id, archived: false }, { archived: true }, { new: true });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: `Table ${tableToDelete.name} has been deleted.`,
      table: tableToDelete
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

router.post("/tables/access", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {

    const { currentToken, passcode } = req.body;

    const table = await TABLE.findOne({ currentToken, passcode, archived: false }).populate({
      path: "establishment",
      model: ESTABLISHMENT,
      populate: {
        path: "settings",
        model: ESTABLISHMENT_SETTINGS
      }
    });

    if (isEmpty(table)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_TABLE_FOUND
      });
    }

    const inventories = await INVENTORY.find({ establishment: table.establishment._id, archived: false });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: `Table ${table.name} has been accessed.`,
      table,
      inventories
    });

  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR,
      error: error
    });
  }
});

module.exports = router;
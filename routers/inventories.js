const express = require("express");
const router = express.Router();
const { isEmpty, get } = require("lodash");

const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages.js");
const { verifySessionToken, limitMinimumAccessTo } = require("../utilities/middlewares/users.js");
const { ROLES } = require("../common/constants");
const INVENTORY = require("../schemas/inventories.js");
const ESTABLISHMENT = require("../schemas/establishment.js");

router.post("/inventory/create", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const { body } = req;
    console.log(body);
    const newInventory = await new INVENTORY({
      establishment: establishment._id,
      name: body.name,
      description: body.description,
      quantity: get(body, "type", 0) === 0 ? body.quantity : Infinity,
      price: body.price,
      type: get(body, "type", 0)
    }).save();

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Inventory created successfully.",
      inventory: newInventory
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.patch("/inventory/update/:inventoryId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { body } = req;

    const updatedInventory = await INVENTORY.findOneAndUpdate({ _id: inventoryId, archived: false, }, {...body, quantity: get(body, "type", 0) === 0 ? body.quantity : Infinity }, { new: true });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Inventory updated successfully.",
      inventory: updatedInventory
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/inventory/me", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const inventories = await INVENTORY.find({ establishment: establishment._id, type: 0, archived: false });

    return res.status(HTTP_CODES.SUCCESS).json({
      inventories
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.delete("/inventory/delete/:inventoryId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const { inventoryId } = req.params;

    await INVENTORY.findOneAndUpdate({ _id: inventoryId, archived: false }, { archived: true }, { new: true });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Inventory deleted successfully."
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/inventory/:establishmentId", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {

    const establishmentId = get(req.params, "establishmentId", null);
    
    if (isEmpty(establishmentId)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment id provided."
      });
    };
    const inventories = await INVENTORY.find({ establishment: establishmentId, type: 0, archived: false });

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
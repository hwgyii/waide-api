const express = require("express");
const router = express.Router();
const { isEmpty, get } = require("lodash");
const dayjs = require("dayjs");
const uniqid = require("uniqid");

const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages.js");
const { validateFields } = require("../utilities/services/validation.js");
const { verifySessionToken, limitMinimumAccessTo } = require("../utilities/middlewares/users.js");
const { ROLES, TABLE_AVAILABILITY } = require("../common/constants");

const ESTABLISHMENT = require("../schemas/establishment.js");
const INVENTORY = require("../schemas/inventories.js");
const SALES = require("../schemas/sales.js");
const INVENTORY_SALES = require("../schemas/inventory-sales.js");
const DELIVERY = require("../schemas/delivery.js");
const TABLE = require("../schemas/table.js");
const ESTABLISHMENT_SETTINGS = require("../schemas/establishment-settings.js");

router.post("/sales/create", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {
    const { body } = req;

    //validate fields here
    console.log(JSON.stringify(body, null, 2));
    const establishment = await ESTABLISHMENT.findOne({ _id: body.establishmentId, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    if (isEmpty(body.orders)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ORDER_PROVIDED
      });
    }

    const errors = [];
    await Promise.all(Object.keys(body.orders).map(async (productId) => {

      const inventory = await INVENTORY.findOne({ _id: productId, type: 0, archived: false });

      if (isEmpty(inventory)) errors.push(`${inventory.name} is not found in the inventories.`);

      if (inventory.quantity < body.orders[productId].orderSize) errors.push(`${inventory.name} has less than ${body.orders[productId].orderSize} in stock.`);
    }));

    if (errors.length > 0) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: errors.join(" ")
      });
    };

    let inventorySales = await Promise.all(Object.keys(body.orders).map(async (productId) => {
      await INVENTORY.findOneAndUpdate({ _id: body.orders[productId]._id, archived: false, type: 0, }, { $inc: { quantity: -get(body.orders[productId], "orderSize", 0) } }, { new: true });

      return new INVENTORY_SALES({
        item: productId,
        quantity: body.orders[productId].orderSize,
        subtotal:  (Math.round(body.orders[productId].price *  body.orders[productId].orderSize * 100) / 100).toFixed(2)
      }).save();
    }));


    const newSaleData = {
      establishment: establishment._id,
      items: inventorySales,
      totalPrice: (Math.round(body.totalPrice * 100) / 100).toFixed(2),
      isCompleted: get(body, "isCompleted"),
      description: "Takeout",
    };
    
    let table;
    if (!isEmpty(body.table)) {
      table = await TABLE.findOne({ _id: body.table, archived: false });
      newSaleData.table = body.table;
      newSaleData.description = `${table.name}`
    }

    const newSale = await new SALES(newSaleData).save();

    const inventories = await INVENTORY.find({ establishment: establishment._id, type: 0, archived: false });

    if (!isEmpty(body.table)) {
      function generateSixDigitNumberAsString() {
        const min = 100000;
        const max = 999999;
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        return randomNumber.toString();
      }

      if (table.availability === TABLE_AVAILABILITY.OCCUPIED) table = await TABLE.findOneAndUpdate({ _id: body.table, archived: false }, { totalPrice: newSale.totalPrice + table.totalPrice,  sales: [table.sales, newSale._id].flat() }, { new: true }).populate({
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
      }).populate({
        path: "establishment",
        model: ESTABLISHMENT,
        populate: {
          path: "settings",
          model: ESTABLISHMENT_SETTINGS,
        }
      });
      else table = await TABLE.findOneAndUpdate({ _id: body.table, archived: false }, { availability: TABLE_AVAILABILITY.OCCUPIED, currentToken: uniqid().slice(-6), passcode: generateSixDigitNumberAsString(), sales: [newSale._id], totalPrice: newSale.totalPrice }, { new: true }).populate({
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
      }).populate({
        path: "establishment",
        model: ESTABLISHMENT,
        populate: {
          path: "settings",
          model: ESTABLISHMENT_SETTINGS,
        }
      });
    }
      // NOT YET IMPLEMENTED
    //CHECK IF FOR A TABLE YUNG SALES TAPOS KAPAG YES, IPOPUSH MO YUNG NEW SALE SA SALES ARRAY SA TABLE AND INCREMENT THE TOTAL SA TOTALPRICE SA TABLE

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Sale created successfully.",
      sale: newSale,
      inventories,
      table
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.post("/sales/delivery/create", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {

    const { body } = req;

    const establishment = await ESTABLISHMENT.findOne({ _id: body.establishmentId, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment found."
      });
    }

    if (isEmpty(body.orders)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ORDER_PROVIDED
      });
    }

    const errors = [];
    await Promise.all(Object.keys(body.orders).map(async (productId) => {

      const inventory = await INVENTORY.findOne({ _id: productId, type: 0, archived: false });

      if (isEmpty(inventory)) errors.push(`${inventory.name} is not found in the inventories.`);

      if (inventory.quantity < body.orders[productId].orderSize) errors.push(`${inventory.name} has less than ${body.orders[productId].orderSize} in stock.`);
    }));

    if (errors.length > 0) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: errors.join(" ")
      });
    };

    let inventorySales = await Promise.all(Object.keys(body.orders).map(async (productId) => {
      await INVENTORY.findOneAndUpdate({ _id: body.orders[productId]._id, archived: false, type: 0, }, { $inc: { quantity: -get(body.orders[productId], "orderSize", 0) } }, { new: true });

      return new INVENTORY_SALES({
        item: productId,
        quantity: body.orders[productId].orderSize,
        subtotal:  (Math.round(body.orders[productId].price *  body.orders[productId].orderSize * 100) / 100).toFixed(2)
      }).save();
    }));

    const newSale = await new SALES({
      establishment: establishment._id,
      items: inventorySales,
      totalPrice:(Math.round(body.totalPrice * 100) / 100).toFixed(2),
      isCompleted: get(body, "isCompleted"),
      description: body.description,
    }).save();

    const newDelivery = await new DELIVERY({
      user: req.user._id,
      sales: newSale._id,
      establishment: establishment._id,
      address: body.address
    }).save();

    const inventories = await INVENTORY.find({ establishment: establishment._id, type: 0, archived: false });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Order has been requested.",
      sale: newSale,
      inventories
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/sales/incomplete", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }
    
    const sales = await SALES.find({ establishment: establishment._id, isCompleted: false, archived: false }).populate({
      path: 'items',
      model: INVENTORY_SALES,
      select: 'item quantity subtotal', // Select the ObjectId of the item
      populate: {
        path: 'item',
        model: INVENTORY,
        select: 'name' // Select only the name field of the Inventory model
      }
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      sales
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/sales/establishment", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const sales = await SALES.find({ establishment: establishment._id, archived: false }).populate({
      path: 'items',
      model: INVENTORY_SALES,
      select: 'item quantity subtotal', // Select the ObjectId of the item
      populate: {
        path: 'item',
        model: INVENTORY,
        select: 'name price' // Select only the name field of the Inventory model
      }
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      sales
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.patch("/sales/complete/:salesId", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const salesToUpdate = await SALES.findOneAndUpdate({ _id: req.params.salesId, establishment: establishment._id, isCompleted: false, archived: false }, { isCompleted: true }, { new: true });

    if (!salesToUpdate) {
      return res.status(HTTP_CODES.NOT_FOUND).json({
        message: ERROR_MESSAGES.NO_SALE_FOUND
      });
    }

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Sale completed successfully.",
      sale: salesToUpdate
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/salesToday", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    }

    const findOptions = {
      $and: [
        { "createdAt": { $gte: dayjs().startOf("day") } },
        { "createdAt": { $lte: dayjs().endOf("day") } },
        { establishment: establishment._id },
        { archived: false }
      ],
    };
    
    const sales = await SALES.find(findOptions).populate({
      path: 'items',
      model: INVENTORY_SALES,
      select: 'item quantity subtotal', // Select the ObjectId of the item
      populate: {
        path: 'item',
        model: INVENTORY,
        select: 'name price' // Select only the name field of the Inventory model
      }
    });

    const totalSales = sales.reduce((acc, sale) => acc + sale.totalPrice, 0);
    const inventorySold = sales.reduce((acc, sale) => {
      sale.items.forEach(item => {
      if (!acc[item.item.name]) {
        acc[item.item.name] = {
        quantity: item.quantity,
        price: item.item.price
        };
      } else {
        acc[item.item.name].quantity += item.quantity;
      }
      });
      return acc;
    }, {});

    let inventoryPercentage = Object.keys(inventorySold).map(key => {
      return {
        name: key,
        quantity: inventorySold[key].quantity,
        price: inventorySold[key].price,
        total: (inventorySold[key].quantity * inventorySold[key].price),
        percentage: ((inventorySold[key].quantity * inventorySold[key].price) / totalSales) * 100
      };
    });

    inventoryPercentage = inventoryPercentage.sort((a, b) => b.percentage - a.percentage);


    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Sales retrieved successfully.",
      totalSales,
      inventoryPercentage,
      updateTime: dayjs().format("hh:mm A")
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/sales/deliveries", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {
    const deliveries = await DELIVERY.find({ user: req.user._id ,archived: false }).populate({
      path: 'sales',
      model: SALES,
      populate: {
        path: 'items',
        model: INVENTORY_SALES,
        select: 'item quantity subtotal', // Select the ObjectId of the item
        populate: {
          path: 'item',
          model: INVENTORY,
          select: 'name price' // Select only the name field of the Inventory model
        }
      }
    }).populate({
      path: 'establishment',
      model: ESTABLISHMENT,
      select: 'name'
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      deliveries
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});
module.exports = router;
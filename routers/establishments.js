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

router.post("/establishment/create", async (req, res) => {
  try {
    const validatedFields = req.body;

    if (validatedFields.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: validatedFields.message
      });
    }

    // CHECKING FOR EXISTING USER ACCOUNT AND THEN CREATING NEW USER IF NO EXISTING ACCOUNT

    const existingUser = await USER.findOne({ email: validatedFields.email, archived: false  });

    if (!isEmpty(existingUser)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.EMAIL_ALREADY_TAKEN
      });
    }

    const hashedPassword = await hashPassword(validatedFields.password);

    const newUser = await new USER({
      email: validatedFields.email,
      password: hashedPassword,
      firstName: validatedFields.firstName,
      lastName: validatedFields.lastName,
      fullName: `${validatedFields.firstName} ${validatedFields.lastName}`,
      role: ROLES.ESTABLISHMENT,
    }).save();

    const newSettings = await new ESTABLISHMENT_SETTINGS().save();

    // add file handling here
    await new ESTABLISHMENT({
      user: newUser._id,
      name: validatedFields.businessName,
      // logo: req.files.logo,
      address: validatedFields.address,
      // type: validatedFields.type,
      operatingHours: validatedFields.operatingHours,
      settings: newSettings._id
    }).save();

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Establishment created successfully.",
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// ADD PAGINATION TO THIS ROUTE
router.get("/establishments", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {
    const establishments = await ESTABLISHMENT.find({}).populate({
      path: "settings",
      model: ESTABLISHMENT_SETTINGS
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      establishments
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/establishment/me", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false }).populate({
      path: "settings",
      model: ESTABLISHMENT_SETTINGS
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      establishment
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error
    });
  }
});

router.post("/establishment/review/create", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {
    const { body } = req;

    const establishment = await ESTABLISHMENT.findOne({ _id: body.establishmentId, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment found."
      });
    }

    const newReview = await new REVIEW({
      user: req.user._id,
      establishment: body.establishmentId,
      review: body.review,
      rating: body.rating
    }).save();

    const review = await REVIEW.findOne({ _id: newReview._id, archived: false }).populate({
      path: "user",
      model: USER,
      select: "fullName"
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Review added successfully.",
      review
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.get("/establishment/:establishmentId", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {

    const establishmentId = get(req.params, "establishmentId", null);
    
    if (isEmpty(establishmentId)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment id provided."
      });
    };

    const establishment = await ESTABLISHMENT.findOne({ _id: establishmentId, archived: false }).populate({
      path: "settings",
      model: ESTABLISHMENT_SETTINGS
    });

    if (!establishment) {
      return res.status(HTTP_CODES.NOT_FOUND).json({
        message: "No establishment found."
      });
    }

    let inventories = [];
    let invoices = [];
    let tables = [];
    let reviews = [];

    if (get(establishment.settings, "inventoryEnabled", false)) {
      inventories = await INVENTORY.find({ establishment: establishment._id, archived: false, type: 0 });
    };

    if (get(establishment.settings, "invoiceEnabled", false)) {
      invoices = await INVENTORY.find({ establishment: establishment._id, archived: false , type: 1 });
    }

    if (get(establishment.settings, "tablesEnabled", false)) {
      tables = await TABLE.find({ establishment: establishment._id, archived: false });
    }

    reviews = await REVIEW.find({ establishment: establishment._id, archived: false }).populate({
      path: "user",
      model: USER,
      select: "fullName"
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      establishment,
      inventories,
      invoices,
      tables,
      reviews
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.patch("/establishment/settings", verifySessionToken, limitMinimumAccessTo(ROLES.ESTABLISHMENT), async (req, res) => {
  try {
    const establishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false });

    if (isEmpty(establishment)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ESTABLISHMENT_FOUND
      });
    };

    const { newSettings } = req.body;
    
    const settingsToUpdate = await ESTABLISHMENT_SETTINGS.findOneAndUpdate({ _id: establishment.settings, archived: false }, { ...newSettings }, { new: true });

    const updatedEstablishment = await ESTABLISHMENT.findOne({ user: req.user._id, archived: false }).populate({
      path: "settings",
      model: ESTABLISHMENT_SETTINGS
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Settings updated successfully.",
      establishment: updatedEstablishment
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// what if logo yung papalitan? not included in this route yet.
router.patch("/establishment/:establishmentId", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try {

    const validatedFields = validateFields(req.body, {
      name: { type: "string", required: true },
      // logo: { type: "string", required: true },
      address: { type: "string", required: true },
      type: { type: "number", required: true },
      // availability: { type: "boolean", required: true } // this field will be array of dates
    });

    if (validatedFields.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: validatedFields.message
      });
    }

    const establishmentId = get(req.params, "establishmentId", null);

    if (isEmpty(establishmentId)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment id provided."
      });
    }

    const establishmentToUpdate = await ESTABLISHMENT.findOneAndUpdate({ _id: establishmentId, archived: false }, { ...validatedFields }, { new: true }).populate({
      path: "settings",
      model: ESTABLISHMENT_SETTINGS
    });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Establishment updated successfully.",
      establishment: establishmentToUpdate
    });

  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

router.delete("/establishment/:establishmentId", verifySessionToken, limitMinimumAccessTo(ROLES.CUSTOMER), async (req, res) => {
  try { 
    const establishmentId = get(req.params, "establishmentId", null);

    if (isEmpty(establishmentId)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: "No establishment id provided."
      });
    }

    await ESTABLISHMENT.findOneAndUpdate({ _id: establishmentId, archived: false }, { archived: true }, { new: true });

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Establishment deleted successfully.",
    });
  } catch (error) {
    return res.status(HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
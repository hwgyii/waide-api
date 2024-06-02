const express = require("express");
const router = express.Router();
const { isEmpty, get } = require("lodash");
const uniqid = require("uniqid");
const jwt = require("jsonwebtoken");

const { HTTP_CODES, ERROR_MESSAGES } = require("../common/http-codes-and-messages.js");
const { hashPassword, comparePassword } = require("../utilities/services/users.js");
const { ROLES, JWT } = require("../common/constants");
const { validateFields } = require("../utilities/services/validation.js");
const { verifySessionToken } = require("../utilities/middlewares/users.js");

const USER = require("../schemas/user.js");
const ESTABLISHMENT = require("../schemas/establishment.js");
const ESTABLISHMENT_SETTINGS = require("../schemas/establishment-settings.js");


router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const validatedFields = validateFields({ email, password }, 
      {
      email: { type: "string", required: true },
      password: { type: "string", required: true },
    });

    if (validatedFields.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: validatedFields.message
      });
    }

    const existingUser = await USER.findOne({ email: validatedFields.email, archived: false  }).select("password authToken");

    if (isEmpty(existingUser)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_USER_FOUND
      });
    }

    const result = await comparePassword(validatedFields.password, get(existingUser, "password", ""));

    if (!result) {
      return res.status(HTTP_CODES.UNAUTHORIZED).json({
        message: ERROR_MESSAGES.INCORRECT_PASSWORD
      });
    }

    let authToken = existingUser.authToken;

    if (isEmpty(authToken)) {
      authToken = uniqid();
      await USER.updateOne({ _id: existingUser._id }, { authToken });
    }

    const user = await USER.findOne({ email: validatedFields.email, archived: false  });

    const userDetails = {
      userId: existingUser._id,
      authToken,
    }

    const sessionToken = jwt.sign(userDetails, process.env.SESSION_TOKEN_SECRET, { expiresIn: JWT.SESSION_TOKEN_EXPIRATION });

    if (user.role === ROLES.ESTABLISHMENT) {
      const establishment = await ESTABLISHMENT.findOne({ user: user._id, archived: false  }).populate({
        path: "settings",
        model: ESTABLISHMENT_SETTINGS
      });
      return res.status(HTTP_CODES.SUCCESS).json({
        sessionToken,
        user,
        establishment
      });  
    }


    return res.status(HTTP_CODES.SUCCESS).json({
      sessionToken,
      user
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
});

router.post("/user/logout", verifySessionToken, async (req, res) => {
  try {
    const user = await USER.updateOne({ _id: req.user._id }, { authToken: "" });

    if (isEmpty(user)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_USER_FOUND
      });
    }
    
    return res.status(HTTP_CODES.SUCCESS).json({
      message: "User Logged Out"
    });

  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
});

router.post("/user/create", async (req, res) => {
  try {
    const { body } = req;

    const validatedFields = validateFields(body, {
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      email: { type: "string", required: true },
      password: { type: "string", required: true },
      confirmPassword: { type: "string", required: true },
    });

    console.log(validatedFields);

    if (validatedFields.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: validatedFields.message
      });
    }

    const existingUser = await USER.findOne({ email: validatedFields.email, archived: false  });

    if (!isEmpty(existingUser)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.EMAIL_ALREADY_TAKEN
      });
    }

    const hashedPassword = await hashPassword(validatedFields.password);

    await new USER({
      email: validatedFields.email,
      password: hashedPassword,
      firstName: validatedFields.firstName,
      lastName: validatedFields.lastName,
      fullName: `${validatedFields.firstName} ${validatedFields.lastName}`,
      role: body.role || ROLES.UNVERIFIED
    }).save();
    
    return res.status(HTTP_CODES.SUCCESS).json({
      message: "New User Created."
    });
  } catch (error) {
    console.log(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
});

router.get("/user/me", verifySessionToken, async (req, res) => {
  try { 
    const user = await USER.findOne({ _id: req.user._id, archived: false  });

    if (user.role === ROLES.ESTABLISHMENT) {
      const establishment = await ESTABLISHMENT.findOne({ user: user._id, archived: false  }).populate({
        path: "settings",
        model: ESTABLISHMENT_SETTINGS
      });
      return res.status(HTTP_CODES.SUCCESS).json({
        user,
        establishment
      });  
    }

    return res.status(HTTP_CODES.SUCCESS).json({
      user
    });
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
});

router.patch("/user/add-expo-token", verifySessionToken, async (req, res) => {
  try {
    const { body } = req;

    const validatedFields = validateFields(body, {
      expoToken: { type: "string", required: true },
    });

    if (validatedFields.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: validatedFields.message
      });
    }

    const user = await USER.updateOne({ _id: req.user._id }, { expoToken: validatedFields.expoToken });

    if (isEmpty(user)) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_USER_FOUND
      });
    }

    return res.status(HTTP_CODES.SUCCESS).json({
      message: "Expo Token Added."
    });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
});

module.exports = router;
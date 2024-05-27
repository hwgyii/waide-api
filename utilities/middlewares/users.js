const jwt = require("jsonwebtoken");
const { get } = require("lodash");

const { HTTP_CODES, ERROR_MESSAGES } = require("../../common/http-codes-and-messages");

const USER = require("../../schemas/user");

const verifySessionToken = async (req, res, next) => {
  try{
    let sessionToken = req.headers["authorization"].split(" ")[1];

    if (!sessionToken) {
      return res.status(HTTP_CODES.NOT_FOUND).json({
        message: "Missing session token."
      });
    }

    jwt.verify(sessionToken, process.env.SESSION_TOKEN_SECRET, async (error, userDetails) => {
      if (error) {
        return res.status(HTTP_CODES.FORBIDDEN).json({
          message: "Session token expired."
        });
      }

      const existingUser = await USER.findOne( { _id: userDetails.userId, authToken: userDetails.authToken, archived: false  } );

      if (!existingUser) {
        return res.status(HTTP_CODES.NOT_FOUND).json({
          message: "No matched user with given authorization."
        })
      }
      
      req.user = existingUser;
      
      next();
    });
  } catch (error) {
    console.log(error);
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
};

const limitMinimumAccessTo = (accessLevel) => (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_USER_FOUND
      });
    }
    
    const userRole = get(req.user, "role", null);
    
    if (!userRole && userRole !== 0) {
      return res.status(HTTP_CODES.UNPROCESSABLE_ENTITY).json({
        message: ERROR_MESSAGES.NO_ROLE
      });
    }
    
    if (userRole <= accessLevel){
      next();
    } else {
      return res.status(HTTP_CODES.UNAUTHORIZED).json({
        message: ERROR_MESSAGES.NO_PRIVILEGES
      });
    }
  } catch (error) {
    return res.status(HTTP_CODES.SERVER_ERROR).json({
      error,
      message: ERROR_MESSAGES.DEFAULT_SERVER_ERROR
    });
  }
};

module.exports = {
  verifySessionToken,
  limitMinimumAccessTo
}
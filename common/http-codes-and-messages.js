module.exports = {
  HTTP_CODES: {
    SUCCESS: 200,
    UNPROCESSABLE_ENTITY: 422,
    SERVER_ERROR: 500,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    NOT_ALLOWED: 405,
    FORBIDDEN: 403,
  },
  ERROR_MESSAGES: {
    EMAIL_ALREADY_TAKEN: "Email already taken.",
    NO_USER_FOUND: "No user found.",
    INCORRECT_PASSWORD: "Password incorrect.",
    NO_REFRESH_TOKEN_FOUND: "No refresh token found.",
    NO_PRIVILEGES: "User does not have the proper privileges to access this feature.",
    NO_ROLE: "User has no role.",

    NO_ESTABLISHMENT_FOUND: "No establishment found.",
    NO_ORDER_PROVIDED: "No order provided.",
    NO_ITEM_FOUND: "No item found.",
    NO_SALE_FOUND: "No sale found.",
    NO_TABLE_FOUND: "No table found.",
    
    DEFAULT_SERVER_ERROR: "Ooops! Something went wrong on our side. Please contact your administrator.",
  }, 
}
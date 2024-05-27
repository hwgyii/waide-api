const { get, isEmpty } = require("lodash");
const mongoose = require("mongoose");
const { HTTP_CODES } = require("../../common/http-codes-and-messages");

const validateDataType = (valueToValidate = undefined, fieldToValidate = undefined, propertyOfValue = {}) => {
  if (!propertyOfValue.type) {
    return `ValidationError: Missing type for ${fieldToValidate}.\n`;
  }

  if (typeof valueToValidate !== propertyOfValue.type) {
    return `ValidationError: ${fieldToValidate} is of type ${typeof valueToValidate}, not a ${propertyOfValue.type}.\n`;
  }
  return "";
};

/** 
  Description: Will validate object fields.
  Parameters:
    objectToValidate = parameter that holds the object to validate.
    validations = paramaeter that holds the property of each field.
  Return type: Object that contains the value of the validated fields.
**/
const validateFields = (objectToValidate = {}, validations = {}) => {
  let errorMessage = "";

  Object.keys(validations).forEach((field) => {
    const value = get(objectToValidate, [field], undefined);
    const property = get(validations, [field]);

    //@ If field is required but does not have value
    if (property.required && value === undefined) {
      errorMessage = errorMessage.concat(`ValidationError: Field ${field} is required but missing.\n`);
    }

    //@ If field is an object
    let obj;

    if (property.type === "object" && !isEmpty(property.property)) {
      obj = validateFields(value, property.property);
      if (obj.error === "ValidationError" && obj.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
        errorMessage = errorMessage.concat(obj.message);
      }
    }

    //@ If field is an array of objects
    if (property.type === "arrayOfObjects" && !isEmpty(property.property) && value.length) {
      value.forEach((obj) => {
        obj = validateFields(value, property.property);
        if (obj.error === "ValidationError" && obj.status === HTTP_CODES.UNPROCESSABLE_ENTITY) {
          errorMessage = errorMessage.concat(obj.message);
        }
      });
    }

    //@ If field is objectId
    if (value && property.type === "objectId") {
      if (!mongoose.isValidObjectId(value)) {
        errorMessage = errorMessage.concat(`ValidationError: Field ${field} is not a valid Object Id.\n`);
      }
    }

    //@ If field is every other data type
    if (value && (property.type !== "arrayOfObjects" && property.type !== "objectId")) {
      errorMessage = errorMessage.concat(validateDataType(value, field, property));
    }
  });

  //@ IF THERE'S AN ERROR IT WILL THROW IT
  if (errorMessage !== "") return { 
    error: "ValidationError",
    status: HTTP_CODES.UNPROCESSABLE_ENTITY,
    message: errorMessage
  };
  
  //@ It means the data is validated
  return objectToValidate;
};

module.exports = {
  validateFields,
}
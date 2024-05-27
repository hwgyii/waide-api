const bcrypt = require('bcrypt');

const { HASH_ROUNDS } = require("../../common/constants");

const hashPassword = async (password) => {
  return await bcrypt.hash(password, HASH_ROUNDS);
}

const comparePassword = async (inputPassword, password) => {
  try {
    let result = await bcrypt.compare(inputPassword, password);
    return result;
  } catch (error) {
    return error;
  }
}

module.exports = {
  hashPassword,
  comparePassword
};

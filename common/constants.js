module.exports = {
  ROLES: {
    ADMIN: 0,
    ESTABLISHMENT: 1,
    CUSTOMER: 2,
    UNVERIFIED: 3, 
  },
  JWT: {
    SESSION_TOKEN_EXPIRATION: "7d",
  },
  HASH_ROUNDS: 15,
  TABLE_AVAILABILITY: {
    AVAILABLE: 0,
    OCCUPIED: 1,
    RESERVED: 2,
  }
};
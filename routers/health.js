const express = require("express");
const router = express.Router();

router.get("/health", (_, res) => {
  return res.status(200).json({
    message: "Conection established",
    status: true,
    timeStamp: new Date(),
  });
});

module.exports = router;
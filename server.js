require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const mongoose = require("mongoose");
const { get } = require("lodash");

const app = express();
const PORT = get(process.env, "PORT", 3000);

app.use(bodyParser.json({
  limit: "5mb",
  verify: (req, res, buf, encoding) => {
    req.bodyPlainText = buf.toString();
    return true;
  },
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//@ ROUTERS
const HEALTH_ROUTER = require("./routers/health");
const USER_ROUTER = require("./routers/users");
const ESTABLISHMENT_ROUTER = require("./routers/establishments");
const INVENTORIES_ROUTER = require("./routers/inventories");
const SALES_ROUTER = require("./routers/sales");
const TABLES_ROUTER = require("./routers/tables");
const REPORTS_ROUTER = require("./routers/reports");
const INVOICES_ROUTER = require("./routers/invoices");

app.use(HEALTH_ROUTER);
app.use(USER_ROUTER);
app.use(ESTABLISHMENT_ROUTER);
app.use(INVENTORIES_ROUTER);
app.use(SALES_ROUTER);
app.use(TABLES_ROUTER);
app.use(REPORTS_ROUTER);
app.use(INVOICES_ROUTER);


//@ CONNECTION TO MONGODB
const DB_URL = get(process.env, "DB_URL", "mongodb://localhost:27017/");
const DB_USER = get(process.env, "DB_USER", "");
const DB_PASSWORD = get(process.env, "DB_PASSWORD", "");
const DB_URL_POST_FIX = get(process.env, "DB_URL_POST_FIX", "");

let connectionString = `${DB_URL}${DB_USER}:${DB_PASSWORD}${DB_URL_POST_FIX}`;

mongoose.connect(connectionString);

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Server is running on port ${PORT}.`);
  console.log(`Accessing database // ${DB_URL}${DB_URL_POST_FIX}.`);
});
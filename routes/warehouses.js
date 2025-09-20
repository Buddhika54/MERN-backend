const express = require("express");
const router = express.Router();
const { createWarehouse, getWarehouses } = require("../controllers/warehouseController");

router.post("/", createWarehouse);
router.get("/", getWarehouses);

module.exports = router;

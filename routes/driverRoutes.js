const express = require("express");
const router = express.Router();
const {
  createDriver,
  getDrivers,
  updateDriver,
  deleteDriver,
} = require("../controllers/driverController");

router.post("/", createDriver);
router.get("/", getDrivers);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);

module.exports = router;

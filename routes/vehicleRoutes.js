const express = require("express");
const router = express.Router();
const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");

// Add new vehicle
router.post("/", createVehicle);

// Get all vehicles
router.get("/", getVehicles);

// Get single vehicle by ID
router.get("/:id", getVehicleById);

// Update vehicle
router.put("/:id", updateVehicle);

// Delete vehicle
router.delete("/:id", deleteVehicle);

module.exports = router;

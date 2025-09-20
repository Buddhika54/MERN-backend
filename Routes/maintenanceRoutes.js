const express = require("express");
const router = express.Router();

const maintenanceControllers = require("../Controllers/maintenanceControllers");

router.get("/", maintenanceControllers.getMaintenance);
router.post("/", maintenanceControllers.addMaintenance);
router.get("/:id", maintenanceControllers.getById);
router.put("/:id", maintenanceControllers.updateMaintenance);
router.delete("/:id", maintenanceControllers.deleteMaintenance);

module.exports = router;




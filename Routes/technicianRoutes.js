const express = require("express");
const router = express.Router();

// Model not needed here, controllers handle it
const technicianControllers = require("../Controllers/technicianControllers");

router.get("/", technicianControllers.getTechnicians);
router.post("/", technicianControllers.addTechnician);
router.get("/:id", technicianControllers.getTechnicianById);
router.put("/:id", technicianControllers.updateTechnician);
router.delete("/:id", technicianControllers.deleteTechnician);

module.exports = router;

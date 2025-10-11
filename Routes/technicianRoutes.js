const express = require("express");
const router = express.Router();

// Model not needed here, controllers handle it
const technicianControllers = require("../Controllers/technicianControllers");
const sendPdfController = require('../Controllers/sendPdfController'); // ✅ add this line

router.get("/", technicianControllers.getTechnicians);
router.post("/", technicianControllers.addTechnician);
router.get("/:id", technicianControllers.getTechnicianById);
router.put("/:id", technicianControllers.updateTechnician);
router.delete("/:id", technicianControllers.deleteTechnician);
router.post('/send-pdf/:id', sendPdfController.sendPdfToTechnician);
module.exports = router;

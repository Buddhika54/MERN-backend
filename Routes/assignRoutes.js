const express = require("express");
const router = express.Router();

const assignControllers = require("../Controllers/assignControllers");

// Routes
router.get("/", assignControllers.getAssign);
router.post("/", assignControllers.addAssign);
router.get("/:id", assignControllers.getById);
router.put("/:id", assignControllers.updateAssign);
router.delete("/:id", assignControllers.deleteAssign);

module.exports = router;

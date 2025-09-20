const express = require("express");
const router = express.Router();
const {
  getPRs,
  createPR,
  approvePR
} = require("../controllers/purchaseRequestController");

router.get("/", getPRs);


router.post("/", createPR);

router.post("/approve", approvePR);

module.exports = router;

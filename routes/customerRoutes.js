const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

// Add new customer
router.post("/", createCustomer);

// Get all customers
router.get("/", getCustomers);

// Get single customer by ID
router.get("/:id", getCustomerById);

// Update customer
router.put("/:id", updateCustomer);

// Delete customer
router.delete("/:id", deleteCustomer);

module.exports = router;

import express from "express";
import {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
} from "../controllers/deliveryController.js";

const router = express.Router();

router.post("/", createDelivery);
router.get("/", getDeliveries);
router.get("/:id", getDeliveryById);
router.put("/:id", updateDelivery);
router.delete("/:id", deleteDelivery);

export default router;

import Delivery from "../models/Delivery.js";

// @desc   Create new delivery
// @route  POST /api/deliveries
export const createDelivery = async (req, res) => {
  try {
    const delivery = new Delivery(req.body);
    const savedDelivery = await delivery.save();
    res.status(201).json(savedDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc   Get all deliveries
// @route  GET /api/deliveries
export const getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find();
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get delivery by ID
// @route  GET /api/deliveries/:id
export const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update delivery
// @route  PUT /api/deliveries/:id
export const updateDelivery = async (req, res) => {
  try {
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedDelivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    res.json(updatedDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc   Delete delivery
// @route  DELETE /api/deliveries/:id
export const deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    res.json({ message: "Delivery deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

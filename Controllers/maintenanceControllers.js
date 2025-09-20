const Maintenance = require("../Model/Maintenance");
const mongoose = require("mongoose"); // ADD THIS AT THE TOP

//Get all Maintenance records
const getMaintenance = async (req, res, next) => {
    let maintenances;
    try {
        maintenances = await Maintenance.find();
    } catch (err) {
        console.log(err);
    }
    if (!maintenances) {
        return res.status(404).json({ message: "No maintenance records found" });
    }
    return res.status(200).json({ maintenances });
};

//Add a new Maintenance record
const addMaintenance = async (req, res, next) => {
    const { machineName, priority, date, description, status } = req.body;
    let maintenance;
    try {
        maintenance = new Maintenance({ machineName, priority, date, description, status });
        await maintenance.save();
    } catch (err) {
        console.log(err);
    }
    if (!maintenance) {
        return res.status(404).json({ message: "Unable to add maintenance record" });
    }
    return res.status(200).json({ maintenance });
};

//Get Maintenance by Id
const getById = async (req, res, next) => {
    const id = req.params.id;

    // Validate the ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
    }
    let maintenance;
    try {
        maintenance = await Maintenance.findById(id);
    } catch (err) {
        console.log(err);
    }
    if (!maintenance) {
        return res.status(404).json({ message: "Maintenance record not found" });
    }
    return res.status(200).json({ maintenance });
};

//Update Maintenance
const updateMaintenance = async (req, res, next) => {
    const id = req.params.id;

     // Validate the ID
    if (!id  || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
    }
    const { machineName, priority, date, description, status } = req.body;
    let maintenance;
    try {
        maintenance = await Maintenance.findByIdAndUpdate(id,
            { machineName, priority, date, description, status },
            { new: true }
        );
    } catch (err) {
        console.log(err);
    }
    if (!maintenance) {
        return res.status(404).json({ message: "Unable to update maintenance record" });
    }
    return res.status(200).json({ maintenance });
};

//Delete Maintenance
const deleteMaintenance = async (req, res, next) => {
    const id = req.params.id;
    let maintenance;
    try {
        maintenance = await Maintenance.findByIdAndDelete(id);
    } catch (err) {
        console.log(err);
    }
    if (!maintenance) {
        return res.status(404).json({ message: "Unable to delete maintenance record" });
    }
    return res.status(200).json({ maintenance });
};

exports.getMaintenance = getMaintenance;
exports.addMaintenance = addMaintenance;
exports.getById = getById;
exports.updateMaintenance = updateMaintenance;
exports.deleteMaintenance = deleteMaintenance;

const Technician = require("../Model/Technician");

// Get all technicians
const getTechnicians = async (req, res, next) => {
    let technicians;
    try {
        technicians = await Technician.find();
    } catch (err) {
        console.log(err);
    }

    if (!technicians) {
        return res.status(404).json({ message: "No technicians found" });
    }
    return res.status(200).json({ technicians });
};

// Add a technician
const addTechnician = async (req, res, next) => {
    const { name, email, phone, specialty,availability,work } = req.body;

    let technician;
    try {
        technician = new Technician({ name, email, phone, specialty,availability,work });
        await technician.save();
    } catch (err) {
        console.log(err);
    }

    if (!technician) {
        return res.status(404).json({ message: "Unable to add technician" });
    }
    return res.status(200).json({ technician });
};

// Get technician by ID
const getTechnicianById = async (req, res, next) => {
    const id = req.params.id;
    let technician;

    try {
        technician = await Technician.findById(id);
    } catch (err) {
        console.log(err);
    }

    if (!technician) {
        return res.status(404).json({ message: "Technician not found" });
    }
    return res.status(200).json({ technician });
};

// Update technician
const updateTechnician = async (req, res, next) => {
    const id = req.params.id;
    const { name, email, phone, specialty,availability,work } = req.body;

    let technician;
    try {
        technician = await Technician.findByIdAndUpdate(id, {
            name,
            email,
            phone,
            specialty,
            availability,
            work
        }, { new: true }); // returns updated document
    } catch (err) {
        console.log(err);
    }

    if (!technician) {
        return res.status(404).json({ message: "Unable to update technician" });
    }
    return res.status(200).json({ technician });
};

// Delete technician
const deleteTechnician = async (req, res, next) => {
    const id = req.params.id;

    let technician;
    try {
        technician = await Technician.findByIdAndDelete(id);
    } catch (err) {
        console.log(err);
    }

    if (!technician) {
        return res.status(404).json({ message: "Unable to delete technician" });
    }
    return res.status(200).json({ technician });
};

module.exports = {
    getTechnicians,
    addTechnician,
    getTechnicianById,
    updateTechnician,
    deleteTechnician
};

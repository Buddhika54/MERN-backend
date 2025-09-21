const Assign = require("../Model/Assign");

// ✅ Get all assignments
const getAssign = async (req, res, next) => {
    let assigns;
    try {
        assigns = await Assign.find()
           
    } catch (err) {
        console.log(err);
    }

    if (!assigns) {
        return res.status(404).json({ message: "No assignments found" });
    }
    return res.status(200).json({ assigns });
};

// ✅ Add new assignment
const addAssign = async (req, res, next) => {
    const { techname,machinename,adate,issue,edate } = req.body;

    let assign;
    try {
        assign = new Assign({ techname,machinename,adate,issue,edate });
        await assign.save();
    } catch (err) {
        console.log(err);
    }

    if (!assign) {
        return res.status(400).json({ message: "Unable to assign technician" });
    }
    return res.status(200).json({ assign });
};

// ✅ Get assignment by ID
const getById = async (req, res, next) => {
    const id = req.params.id;
    let assign;

    try {
        assign = await Assign.findById(id)
            
    } catch (err) {
        console.log(err);
    }

    if (!assign) {
        return res.status(404).json({ message: "Assignment not found" });
    }
    return res.status(200).json({ assign });
};

// ✅ Update assignment
const updateAssign = async (req, res, next) => {
    const id = req.params.id;
    const { techname,machinename,adate,issue,edate } = req.body;

    let assign;
    try {
        assign = await Assign.findByIdAndUpdate(id,
            { techname,machinename,adate,issue,edate },
            { new: true }  // return updated object
        );
    } catch (err) {
        console.log(err);
    }

    if (!assign) {
        return res.status(404).json({ message: "Unable to update assignment" });
    }
    return res.status(200).json({ assign });
};

// ✅ Delete assignment
const deleteAssign = async (req, res, next) => {
    const id = req.params.id;
    let assign;

    try {
        assign = await Assign.findByIdAndDelete(id);
    } catch (err) {
        console.log(err);
    }

    if (!assign) {
        return res.status(404).json({ message: "Unable to delete assignment" });
    }
    return res.status(200).json({ assign });
};

exports.getAssign = getAssign;
exports.addAssign = addAssign;
exports.getById = getById;
exports.updateAssign = updateAssign;
exports.deleteAssign = deleteAssign;

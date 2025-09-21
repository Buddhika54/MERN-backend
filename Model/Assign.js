const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AssignSchema = new Schema({
    techname: {
       type:String,
       
        required: true
    },
    machinename: {
        type: String,
        
        required: true
    },
        adate: {
        type: Date,
        default: Date.now
    },
        issue: {
        type: String,
        require:true
    },
    edate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Assign", AssignSchema);

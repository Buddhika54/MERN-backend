const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const adminSchema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type:String, required: true},
    role:{type:String, enum: ["admin", "employee"], required: true},
    profileImage: {type: String},
    creatAt: {type: Date, default: Date.now},
    updatetAt: {type: Date, default: Date.now},

});

const Admin = mongoose.model('Admin',adminSchema);
module.exports = Admin;


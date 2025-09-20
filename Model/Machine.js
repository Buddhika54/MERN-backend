const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const MachineSchema = new Schema ({

    name:{
        type:String,//data type
        required:true,//validate
    },

    type:{
        type:String,//data type
    },

    location:{
        type:String,//data type
    },

    status:{
        type:String,//data type
        required:true,//validate
    }

});


module.exports=mongoose.model(

    "Machine",//file name
    MachineSchema//function name
)
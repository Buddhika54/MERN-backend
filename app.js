const express= require("express");
const mongoose= require("mongoose");     //KfPBwAU43DcW9Ool
const router= require("./Routes/machineRoutes");
const maintenanceRouter = require("./Routes/maintenanceRoutes");

const app= express();
const cors = require("cors");

//middleware
app.use(express.json());
app.use(cors());
app.use("/Machine",router);
app.use("/Maintenance", maintenanceRouter);

    


mongoose.connect("mongodb+srv://admin:KfPBwAU43DcW9Ool@cluster1.uulgpma.mongodb.net/")
.then(()=> console.log("Connected to MongoDB"))
.then(()=>{
    app.listen(5000);
})
.catch((err)=> console.log((err)));
const Machine=require("../Model/Machine");

const getMachine = async (req,res,next) => {

    let Machines;

    try{
        Machines= await Machine.find();
    }catch(err) {
        console.log(err);
    }
    //not found
    if(!Machines){
        return res.status(404).json({message:"machine not found"})
    }
    //display all machines
    return res.status(200).json({Machines});
};

//data Insert
const addMachine = async (req,res,next) =>{

    const {name,type,location,status}=req.body;

    let Machines;

    try{
        Machines=new Machine({name,type,location,status});
        await Machines.save();
    }catch(err) {
        console.log(err);
    }

    //not insert machines

    if(!Machines){
        return res.status(404).json({message:"unable to add machine"});
    }
    return res.status(200).json({Machines});

};

//Get by Id
const getById= async(req,res,next)=>{
    const id = req.params.id;
    let Machines;

    try{
        Machines=await Machine.findById(id);

    }catch(err){
        console.log(err);
    }

        //not available users

    if(!Machines){
        return res.status(404).json({message:"machine not found"});
    }
    return res.status(200).json({Machines});

};

//update machine details
const updateMachine = async(req,res,next)=>{
        const id = req.params.id;
           const {name,type,location,status}=req.body; 

           let Machines;

           try{
            Machines=await Machine.findByIdAndUpdate(id,
                {name:name,type:type,location:location,status:status});
            Machines=await Machines.save();
           }catch(err){
            console.log(err);
           }
              if(!Machines){
        return res.status(404).json({message:"unable to update"});
    }
    return res.status(200).json({Machines});

};

//delete machine details

const deleteMachine =async(req,res,next)=>{
    const id = req.params.id;

    let Machines;

     try{
        Machines=await Machine.findByIdAndDelete(id);

    }catch(err){
        console.log(err);
    }

        //not available machines

    if(!Machines){
        return res.status(404).json({message:"unable to delete user"});
    }
    return res.status(200).json({Machines});
};

exports.getMachine =  getMachine ;
exports.addMachine =  addMachine ;
exports.getById=getById;
exports.updateMachine=updateMachine;
exports.deleteMachine=deleteMachine;
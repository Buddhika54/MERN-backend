const { response } = require('./app');
const Admin= require('./model/model');
const Department = require('./model/AddDepartment');
const Employee = require('./model/Emplyee');
const bcrypt = require('bcrypt');
const jwt = require ('jsonwebtoken');
const multer = require('multer');
const path = require('path');





const adminRegister = async (req, res, next) => {

    try {
        const hashPassword = await  bcrypt.hash("admin", 10)
        const admin = new Admin({
            name: "Admin",
            email: "admin@gmail.com",
            password: hashPassword,
            role: "admin"

    });
    await admin.save();
    } catch (error) {
        console.log(error)
    }
    
};


const adminLogin = async (req, res, next) => {
    try{
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email })
        if(!admin){
            return res.status(404).json({success: false, error: "User Not Found"})
        }

        const isMatch = await bcrypt.compare(password, admin.password)
        if(!isMatch){
            return res.status(404).json({success: false, error: "Wrong Password"})
        }

        const token = jwt.sign({_id: admin._id, role: admin.role},
            "jwtScreteKeyAAA333@@@###8889999jjdd",{expiresIn: "10d"}
        )

        res.status(200).json({success: true, token, admin: {_id: admin._id, name: admin.name, role: admin.role},
        });
    }catch(error){
        return res.status(500).json({success: false, error: error.message});
    }
};

const verify = (req,res) => {
    return res.status(200).json({success: true, admin: req.admin})
}


const addDepartment = async (req, res) => {
    try {
        const {dep_name, description} = req.body;
        const newDep = new Department({
            dep_name: dep_name,
            description: description
        })
        await newDep.save()
        return res.status(200).json({success: true, department: newDep})

    } catch (error) {
        return res.status(500).json({success: false, error: "add department server error"})
    }
}

const getDepartment = async (req, res) =>{
    try {
        const departments = await Department.find()
        return res.status(200).json({success: true, departments})
    } catch (error) {
        return res.status(500).json({success: false, error: "get department server error"})
    }
}

const showDepartment = async (req, res) => {
    try {
        const {id} = req.params;
        const department = await Department.findById({_id: id})
        return res.status(200).json({success: true, department})
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "get show department server error"})
    }
}

const updateDepartment = async (req, res) => {
    try{
        const {id} = req.params;
        const {dep_name, description} = req.body
        const updateDep = await Department.findByIdAndUpdate({_id: id}, {
            dep_name: dep_name,
            description: description
        })
        return res.status(200).json({success: true, updateDep})
    } catch (error) {
        return res.status(500).json({success: false, error: "edit department server error"})
    }

}

const deleteDepartment = async (req, res) => {
    try{
        const {id} = req.params;
        const deleteDep = await Department.findByIdAndDelete({_id: id})
        return res.status(200).json({success: true, deleteDep})
    } catch (error) {
        return res.status(500).json({success: false, error: "delete department server error"})
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, "public/uploads")
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({storage: storage})


const addEmployee = async (req, res) => {
    try{
        const{
            name,
            email,
            employeeId,
            dob,
            gender,
            martalStatus,
            designation,
            department,
            salary,
            password,
            role,

        }= req.body;


        const user = await Admin.findOne({email})
        if(user){
            return res.status(400).json({success: false, error: "User already registerd in employee"})
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = new Admin({
            name,
            email,
            password: hashPassword,
            role,
            profileImage: req.file ? req.file.filename : ""
        })

        const savedUser = await newUser.save()

        const newEmployee = new Employee({
            userId: savedUser._id,
            employeeId,
            dob,
            gender,
            martalStatus,
            designation,
            department,
            salary
        })

        await newEmployee.save()
        return res.status(200).json({success: true, message: "employee created"})

    } catch(error){
        console.log(error.message)
        return res.status(500).json({success: false, error: "Server error in adding employee"})
    }
}


const getEmployee = async (req, res) =>{
    try {
        
        const employees = await Employee.find().populate('userId', {password: 0}).populate('department')
        return res.status(200).json({success: true, employees})
    } catch (error) {
        return res.status(500).json({success: false, error: "get employee server error"})
    }
}


exports.upload = upload.single('image');
exports.addEmployee = addEmployee;
exports.deleteDepartment = deleteDepartment;
exports.updateDepartment = updateDepartment;
exports.showDepartment = showDepartment;
exports.getDepartment = getDepartment;
exports.addDepartment = addDepartment;
exports.adminRegister = adminRegister;
exports.adminLogin = adminLogin;
exports.verify = verify;
exports.getEmployee = getEmployee;
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyUser = require('./middleware');




router.post('/admin', controller.adminRegister)
router.post('/adlogin', controller.adminLogin)
router.get('/verify', verifyUser, controller.verify);
router.post('/add', verifyUser, controller.addDepartment)
router.get('/department', verifyUser, controller.getDepartment)
router.get('/:id',  verifyUser, controller.showDepartment)
router.put('/:id',  verifyUser, controller.updateDepartment)
router.delete('/:id',  verifyUser, controller.deleteDepartment)

router.post('/empadd', verifyUser, controller.upload ,controller.addEmployee)
router.get('/employee', verifyUser, controller.getEmployee)



module.exports = router;
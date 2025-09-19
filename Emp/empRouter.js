const express = require('express');
const empRouter = express.Router();
const controller = require('../controller');
const verifyUser = require('../middleware');

empRouter.get('/:id',  verifyUser, controller.getEmployees)
empRouter.put('/:id',  verifyUser, controller.updateEmployee)
empRouter.get('/department/:id', verifyUser, controller.fetchEmployeeByDepId)
empRouter.post('/addSalary', verifyUser, controller.addSalary)
empRouter.get('/salary/:id', verifyUser, controller.getSalary)
module.exports = empRouter;
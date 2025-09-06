const express = require('express');
const app = express();
const cors = require('cors');
const controller = require('./controller');

app.use(cors());

app.use(
    express.urlencoded({
        extended: true,
    })
)

app.use(express.json());


app.post('/admin', (req, res) =>{
    controller.adminRegister((req, res, next) =>{
        res.send();
    });
});

app.post('/adlogin', (req, res) =>{
    controller.adminLogin((req, res, next) =>{
        res.send();
    });
});

app.get('/verify', (req, res) =>{
    controller.verify((req, res) =>{
        res.send();
    });
});



app.post('/add', (req,res) => {
    controller.addDepartment((req, res) => {
        res.send();
    });
});

app.post('/empadd', (req,res) => {
    controller.addEmployee((req, res) => {
        res.send();
    });
});

app.get('/department', (req, res) => {
    controller.getDepartment((req,res) => {
        res.send();
    });
});

app.get('/employee', (req, res) => {
    controller.getEmployee((req,res) => {
        res.send();
    });
});

module.exports = app;
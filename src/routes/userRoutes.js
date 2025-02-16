const express = require("express");


const router = express.Router();
const {Getusers,CreateUser} = require('../services/userService')


router.get("/users", Getusers);
router.post("/users", CreateUser);

module.exports = router;


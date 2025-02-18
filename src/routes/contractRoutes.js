const express = require("express");
const router = express.Router();
const { 
  createContract, 
  getContracts, 
  getContractById, 
  updateContract, 
  deleteContract 
} = require("../services/contractService");

router.post("/contracts", createContract);
router.get("/contracts", getContracts);
router.get("/contracts/:id", getContractById); 
router.put("/contracts/:id", updateContract); 
router.delete("/contracts/:id", deleteContract); 

module.exports = router;
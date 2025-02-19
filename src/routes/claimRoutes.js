const express = require("express");
const router = express.Router();
const { 
  createClaim, 
  getClaims, 
  getClaimById, 
  updateClaim, 
  deleteClaim 
} = require("../services/claimService");

router.post("/claims", createClaim);
router.get("/claims", getClaims);
router.get("/claims/:id", getClaimById); 
router.put("/claims/:id", updateClaim); 
router.delete("/claims/:id", deleteClaim); 

module.exports = router;
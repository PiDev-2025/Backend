const Claim = require("../models/claimModel");

// Create a new claim
const createClaim = async (req, res) => {
  try {
    const claim = new Claim(req.body);
    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all claims
const getClaims = async (req, res) => {
  try {
    const claims = await Claim.find();
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single claim by ID
const getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }
    res.status(200).json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a claim
const updateClaim = async (req, res) => {
  try {
    const updatedClaim = await Claim.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Ensure validation
    });

    if (!updatedClaim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    res.status(200).json(updatedClaim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a claim
const deleteClaim = async (req, res) => {
  try {
    const deletedClaim = await Claim.findByIdAndDelete(req.params.id);
    if (!deletedClaim) {
      return res.status(404).json({ message: "Claim not found" });
    }
    res.status(200).json({ message: "Claim deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClaim,
  getClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
};
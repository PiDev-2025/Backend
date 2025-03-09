const express = require("express");

const router = express.Router();
const { saveRequestParking, updateParkingRequest } = require("../controllers/parkingRequestController");
const { uploadParking , getUserFromToken} = require("../middlewares/uploadMiddleware")
router.post("/addParkingRequest", getUserFromToken, uploadParking, saveRequestParking);
router.put("/update/:id", uploadParking, updateParkingRequest);

  
  
module.exports = router;
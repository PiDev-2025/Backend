const express = require("express");
const router = express.Router();
const { saveRequestParking, updateParkingRequest , getParkings} = require("../controllers/parkingRequestController"); // ✅ Corrigé !
const { uploadParking , getUserFromToken} = require("../middlewares/uploadMiddleware")
router.post("/addParkingRequest", getUserFromToken, uploadParking, saveRequestParking);
router.put("/update/:id", uploadParking, updateParkingRequest);
router.get("/parkings", getParkings);

module.exports = router;
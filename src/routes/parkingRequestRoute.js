const express = require("express");
const router = express.Router();
const { saveRequestParking, updateParkingRequest } = require("../controllers/parkingRequestController"); // ✅ Corrigé !
const { upload , getUserFromToken} = require("../middlewares/uploadMiddleware")
router.post("/addParkingRequest", getUserFromToken, upload, saveRequestParking);
router.put("/update/:id", upload, updateParkingRequest);
module.exports = router;
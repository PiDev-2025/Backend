const express = require('express');
const app = express();
const port = 3000;
const connectDB = require("./src/config/db");
var http = require('http')

connectDB();


app.use(express.json());
const claimRoutes = require("./src/routes/claimRoutes"); 
const userRoutes = require("./src/routes/userRoutes");
const contractRoutes = require("./src/routes/contractRoutes"); 
const parkingRoutes = require("./src/routes/parkingRoutes"); 
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
app.use("/User", userRoutes);
app.use("/api", claimRoutes); 
app.use("/api", contractRoutes);
app.use("/api", parkingRoutes);
app.use("/api", reportRoutes); 
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes); 


// Simple Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

var server = http.createServer(app)
server.listen(port,()=>{
  console.log('server started !');
})



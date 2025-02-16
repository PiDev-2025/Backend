const express = require('express');
const app = express();
const port = 3000;
const connectDB = require("./src/config/db");
var http = require('http')

connectDB();


app.use(express.json());

const userRoutes = require("./src/routes/userRoutes");
app.use("/User", userRoutes);


// Simple Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

var server = http.createServer(app)
server.listen(port,()=>{
  console.log('server started !');
})



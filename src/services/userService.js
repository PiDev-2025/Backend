const User = require("../models/UserModel");

// Get all users
const Getusers = async (req, res) => {
  const users = await User.find();
  res.json(users);
}


// Create a new user
const CreateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {Getusers,CreateUser}; 
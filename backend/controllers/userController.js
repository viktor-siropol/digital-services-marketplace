import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/userModel.js";
import bcrypt, { compare, hash } from "bcryptjs"
import createToken from "../utilites/createToken.js"


const createUser = asyncHandler(async (req,res) => {
  const {username, email, password} = req.body;
  if(!username || !email || !password ) {
    throw new Error("Please fill all inputs");
  }

  const userExist = await User.findOne({email})
  if(userExist){
    res.status(400);
    throw new Error("User already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);


  const newUser = new User({username, email, password: hashedPassword})

  try{
    await newUser.save();
    createToken(res,newUser._id);

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      isSeller: newUser.isSeller,
      isAdmin: newUser.isAdmin,
    });
  } catch(error) {
    res.status(400);
    throw new Error("Invalid user data")
  }

});

const LoginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please fill all inputs");
  }

  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    res.status(400);
    throw new Error("Wrong credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) {
    res.status(400);
    throw new Error("Wrong credentials");
  }

  createToken(res, existingUser._id);

  return res.status(200).json({
    _id: existingUser._id,
    username: existingUser.username,
    email: existingUser.email,
    isSeller: existingUser.isSeller,
    isAdmin: existingUser.isAdmin,
  });
});


const LogoutUser = asyncHandler(async(req,res)=> {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(201).json({
    message: "Logged out succesfully"
  });
});


const getAllUsers = asyncHandler(async(req,res) => {
  const users = await User.find({});
  res.json(users);
});

const getCurrentUserProfile = asyncHandler(async(req,res) => {
  const user = await User.findById(req.user._id);

  if(!user){
    res.status(404);
    throw new Error("User not found");
  };

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
  });
});

const updateCurrentUserProfile = asyncHandler(async(req,res) => {
  const user = await User.findById(req.user._id);

  if(!user){
    res.status(404);
    throw new Error("User not found");
  }

  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;
  if(req.body.password){
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    user.password = hashedPassword;
  }
  const updatedUser = await user.save();
  res.json({
    _id: updatedUser._id,
    username: updatedUser.username,
    email: updatedUser.email,
    isSeller: updatedUser.isSeller,
    isAdmin: updatedUser.isAdmin,
  });
});

const deleteUserByID = asyncHandler(async(req,res) => {
  const user = await User.findById(req.params.id);

  if(!user){
    res.status(404);
    throw new Error("User not found");
  }

  if(user.isAdmin){
    res.status(403);
    throw new Error("Cannot delete admin user")
  }

  await User.deleteOne({_id: user._id})
  res.json({message: "User deleted"})
})

const getUserById = asyncHandler(async(req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if(!user){
    res.status(404);
    throw new Error("User not found");
  }

  res.json(user)
})

const updateUserProfileById = asyncHandler(async(req,res) => {
  const user = await User.findById(req.params.id);

  if(!user){
    res.status(404);
    throw new Error("User not found");
  }

  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;
  user.isSeller = req.body.isSeller || user.isSeller;
  user.isAdmin = req.body.isAdmin || user.isAdmin;
  const updatedUser = await user.save();
  res.json({
    _id: updatedUser._id,
    username: updatedUser.username,
    email: updatedUser.email,
    isSeller: updatedUser.isSeller,
    isAdmin: updatedUser.isAdmin,
  });
});


export {createUser, LoginUser, LogoutUser, getAllUsers, getCurrentUserProfile, updateCurrentUserProfile, deleteUserByID, getUserById, updateUserProfileById};

import { access } from "fs";
import User from "../models/userschema.js";
import {ApiResponse} from "../utilities/ApiResponse.js"
import { asyncHandler } from "../utilities/asyncHandeler.js";


// ------------------ SIGNUP ------------------
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, longitude, latitude } = req.body;

  // ✅ Check for required fields
  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // ✅ Check for location access
  if (!longitude || !latitude) {
    res.status(400);
    throw new Error("Location permission is required to register");
  }

  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);
  if (isNaN(lon) || isNaN(lat)) {
    res.status(400);
    throw new Error("Invalid location coordinates");
  }

  // ✅ Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error("User already exists");
  }

  // ✅ Build location object
  const location = {
    type: "Point",
    coordinates: [lon, lat],
  };

  // ✅ Create user
  const newUser = new User({
    name,
    email,
    password,
    role,
    location
  });

  await newUser.save();

  const accessToken = newUser.generateAccessToken();
  const refreshToken = newUser.generateRefreshToken();

  res.status(201).json(
    new ApiResponse(201, {
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    }, "User registered successfully")
  );
});

// ------------------ LOGIN ------------------
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const isMatch = await user.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        const logUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, 
                {
                user: logUser, refreshToken, accessToken
            },
        "User looged in sucessfully")
        );

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


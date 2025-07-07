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

// res.cookie("accessToken", accessToken, options);
// res.cookie("refreshToken", refreshToken, options);
// return res.redirect("/api/v1/shop/shopregister");

//--------------------LOGOUT---------------------
export const logOutUser = asyncHandler( async (req, res) => {
   await User.findByIdAndUpdate(
             req.user._id,
             {
               $unset: {
                   refreshToken: 1
               }
             },
             {
              new : true
             }
        )

        const options = {
              httpOnly: true,
              secure: true
        }

        return res
               .status(200)
               .clearCookie("accessToken", options)
               .clearCookie("refreshToken", options)
               .json(
                 200,
                 {},
                 "User logOut Successfully"
               )
});

export const changeUserPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body
});
export const followShop = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { shopId } = req.params;

  // ✅ Check if shop exists
  const shop = await Shop.findById(shopId);
  if (!shop) throw new ApiError(404, "Shop not found");

  // ✅ Add to following list if not already followed
  const user = await User.findById(userId);
  if (!user.followingShops.includes(shopId)) {
    user.followingShops.push(shopId);
    await user.save();
  }

  res.status(200).json(
    new ApiResponse(200, user.followingShops, "Shop followed successfully")
  );
});

export const unfollowShop = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { shopId } = req.params;

  const user = await User.findById(userId);
  user.followingShops = user.followingShops.filter(
    (id) => id.toString() !== shopId
  );
  await user.save();

  res.status(200).json(
    new ApiResponse(200, user.followingShops, "Shop unfollowed successfully")
  );
});

export const getFollowedShops = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate("followingShops");

  res.status(200).json(
    new ApiResponse(200, user.followingShops, "Fetched followed shops")
  );
});

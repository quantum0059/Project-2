import { access } from "fs";
import User from "../models/userschema.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import jwt from "jsonwebtoken";
import { Cart } from "../models/cartSchema.js";
import Shop from "../models/shopschema.js";

import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

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
    location,
  });

  await newUser.save();

  const accessToken = newUser.generateAccessToken();
  const refreshToken = newUser.generateRefreshToken();

  res.status(201).json(
    new ApiResponse(
      201,
      {
        accessToken,
        refreshToken,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      "User registered successfully"
    )
  );
});

export const loginUser = async (req, res) => {
  const { email, password, latitude, longitude } = req.body;

  try {
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Location is required for login" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.isGoogleUser) {
      return res.status(403).json({
        message:
          "This account uses Google login. Please use Google to sign in.",
      });
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    const logUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: logUser,
            refreshToken,
            accessToken,
          },
          "User looged in sucessfully"
        )
      );
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// res.cookie("accessToken", accessToken, options);
// res.cookie("refreshToken", refreshToken, options);
// return res.redirect("/api/v1/shop/shopregister");

// export const googleLogin = asyncHandler(async (req, res) => {
//   const { token, latitude, longitude } = req.body;

//   if (!token || !latitude || !longitude) {
//     throw new ApiError(400, "Google token and location are required");
//   }

//   const ticket = await client.verifyIdToken({
//     idToken: token,
//     audience: process.env.GOOGLE_CLIENT_ID,
//   });

//   const payload = ticket.getPayload();

//   const { email, name, sub: googleId } = payload;

//   const location = {
//     type: "Point",
//     coordinates: [parseFloat(longitude), parseFloat(latitude)],
//   };

//   let user =
//     (await User.findOne({ googleId })) || (await User.findOne({ email }));

//   if (!user) {
//     user = await User.create({
//       name,
//       email,
//       isGoogleUser: true, // Empty because it's Google login
//       googleId,
//       location,
//     });
//   }

//   const accessToken = user.generateAccessToken();
//   const refreshToken = user.generateRefreshToken();

//   user.refreshToken = refreshToken;
//   await user.save({ validateBeforeSave: false });

//   const options = {
//     httpOnly: true,
//     secure: true,
//   };

//   return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//       new ApiResponse(
//         200,
//         {
//           user: {
//             id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//           },
//           accessToken,
//           refreshToken,
//         },
//         "Google login successful"
//       )
//     );
// });

export const googleLogin = asyncHandler(async (req, res) => {
  const { token, latitude, longitude } = req.body;
  // Validate
  if (!token || !latitude || !longitude) {
    throw new ApiError(400, "Google token and location are required");
  }
  // Verify token
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  let user =
    (await User.findOne({ googleId })) || (await User.findOne({ email }));

  if (!user) {
    // *** CRITICAL: LOGIN ONLY IF USER EXISTS ***
    return res.status(404).json({ message: "NOT_REGISTERED" });
  }

  // update location if needed?
  if (latitude && longitude) {
    user.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
    await user.save({ validateBeforeSave: false });
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      message: "Google login successful"
    });
});

export const googleRegister = asyncHandler(async (req, res) => {
  const { token, latitude, longitude } = req.body;
  if (!token || !latitude || !longitude) {
    throw new ApiError(400, "Google token and location are required");
  }
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  let user =
    (await User.findOne({ googleId })) || (await User.findOne({ email }));

  if (user) {
    // Cannot register again!
    return res.status(409).json({ message: "ALREADY_REGISTERED" });
  }

  const location = {
    type: "Point",
    coordinates: [parseFloat(longitude), parseFloat(latitude)],
  };

  user = await User.create({
    name,
    email,
    isGoogleUser: true,
    googleId,
    location,
    // You might get role from body if needed
  });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      message: "Google signup successful"
    });
});


export const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logOut Successfully"));
});

export const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body; //it's like when you have to chnage pasowrd you fill two entry old password and new passowrd in the frontend..

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change Successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "UnAuthorize request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token successfully refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});


export const userProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id)
    .select("-password")
    .populate("followingShops", "shopName address"); // 👈 populate only needed fields

  if (!user) {
    throw new ApiError(400, "No user found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User account fetched"));
});


export const updateAccountDetail = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (!name && !email) {
    throw new ApiError(400, "feild is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        ...(name && { name }), // we're conditionally adding name or email that's why we need (...) spread operator
        ...(email && { email }),
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detail update successfully"));
});

// ✅ FOLLOW CONTROLLER
export const followShop = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { shopId } = req.body;

  const shop = await Shop.findById(shopId);
  if (!shop) throw new ApiError(404, "Shop not found");

  const user = await User.findById(userId);

  if (!user.followingShops.includes(shopId)) {
    user.followingShops.push(shopId);
    await user.save();
  }

  if (!shop.followers.includes(userId)) {
    shop.followers.push(userId);
    await shop.save();
  }

  res.status(200).json(new ApiResponse(200, user.followingShops, "Shop followed successfully"));
});

export const unfollowShop = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { shopId } = req.params;

  const user = await User.findById(userId);
  user.followingShops = user.followingShops.filter(
    (id) => id.toString() !== shopId
  );
  await user.save();

  res
    .status(200)
    .json(
      new ApiResponse(200, user.followingShops, "Shop unfollowed successfully")
    );
});

export const getUserCart = asyncHandler(async (req, res) => {
  const userCart = await Cart.aggregate([
    { $match: { user: req.user._id } },
    {
      $lookup: {
        from: "sales",
        localField: "sales",
        foreignField: "_id",
        as: "salesInfo",
      },
    },
    {
      $unwind: "$salesInfo",
    },

    {
      $lookup: {
        from: "shops",
        localField: "salesInfo.shop",
        foreignField: "_id",
        as: "salesInfo.shop",
      },
    },
    {
      $unwind: "$salesInfo.shop",
    },
    {
      $group: {
        _id: "$_id",
        user: { $first: "$user" },
        sales: { $push: "$salesInfo" },
      },
    },
  ]);

  const sales = userCart[0]?.sales || [];

  return res
    .status(200)
    .json(new ApiResponse(200, sales, "User cart is fetched successfully"));
});

export const getFollowedShops = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate("followingShops");

  res
    .status(200)
    .json(new ApiResponse(200, user.followingShops, "Fetched followed shops"));
});
//667788

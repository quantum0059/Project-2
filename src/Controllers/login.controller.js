import { access } from "fs";
import User from "../models/userschema.js";
import {ApiResponse} from "../utilities/ApiResponse.js"
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import jwt from "jsonwebtoken"
import Cart from "../models/cartSchema.js"

const generateAccessAndRefereshTokens =  async(userId) => {
   try {

    const user = User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}
    
   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating access and refresh token")
   }
}

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
               .json(new ApiResponse(
                 200,
                 {},
                 "User logOut Successfully"
               ))
});

export const changeUserPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body//it's like when you have to chnage pasowrd you fill two entry old password and new passowrd in the frontend..

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
       throw new ApiError(400, "Incorrect password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
           .status(200)
           .json(new ApiResponse(200, {}, "password change Successfully"))

});

export const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
      throw new ApiError(401, "UnAuthorize request")
    }

    try {
        
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

      const user = await User.findById(decodedToken?._id)

      if(!user){
        throw new ApiError(401, "Invalid refresh token")
      }

      if(incomingRefreshToken !== user?.refreshToken){
          throw new ApiError(401, "Invalid refresh token")
      }

      const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)

      const options = {
          httpOnly: true,
          secure: true
      }

      return res
             .status(200)
             .cookie("accessToken", accessToken, options)
             .cookie("refrehToken", newRefreshToken, options)
             .json(
               new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token successfully refreshed"
               )
             )

    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh Token")
    }    
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res
           .status(200)
           .json(new ApiResponse(200, req.user, "current user fetchde successfully"))
})

export const updateAccountDetail = asyncHandler(async (req, res) => {
   const {name, email} = req.body

   if(!name && !email){
      throw new ApiError(400, "feild is required")
   }

   const user = await User.findByIdAndUpdate(
                req.user?._id,
                {
                  $set:{
                    ...(name && {name}),// we're conditionally adding name or email that's why we need (...) spread operator
                    ...(email && {email})
                  }
                },
                {
                  new: true
                }
   )

   if(!user){
    throw new ApiError(400, "User not found")
   }

   return res
          .status(200)
          .json(new ApiResponse(200, user, "Account detail update successfully"))
})

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

export const getUserCart = asyncHandler(async (req, res) => {
     const userCart = await Cart.aggregate([
      {$match : {user: req.user._id}},
      {
        $lookup: {
          from:"sales",
          localField:"sales",
          foreignField:"_id",
          as:"salesInfo"
        }
      },
      {
        $unwind: "$salesInfo"
      },
      
      {
        $lookup:{
          from:"shops",
          localField:"salesInfo.shop",
          foreignField:"_id",
          as:"salesInfo.shop"

        }
      },
      {
        $unwind:"$salesInfo.shop"
      },
      {
        $group: {
          _id:"$_id",
          user: {$first:"$user"},
          sales: {$push: "$salesInfo"}
        }
      }
     ]);

     const sales = userCart[0]?.sales || [];

     return res
            .status(200)
            .json(
              new ApiResponse(200, sales, "User cart is fetched successfully")
            )
})

export const getFollowedShops = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate("followingShops");

  res.status(200).json(
    new ApiResponse(200, user.followingShops, "Fetched followed shops")
  );
});

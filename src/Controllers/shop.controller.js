import Shop from "../models/shopschema.js";
import  User  from "../models/userschema.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import { uploadOnCloudinary } from "../utilities/cloudinary.js";

export const registerShop = asyncHandler(async (req, res) => {
  const {
    shopName,
    address,
    contactDetails,
    location,
    category,
  } = req.body;

  const owner = req.user._id;

  // Validation
  if (!shopName || !address || !contactDetails || !location || !category) {
    throw new ApiError(400, "All fields are required");
  }

  // Parse location if it's a string (e.g., sent as JSON string from frontend)
  let parsedLocation;
  try {
    parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
  } catch (error) {
    throw new ApiError(400, "Invalid location format");
  }

  if (!parsedLocation.coordinates || parsedLocation.coordinates.length !== 2) {
    throw new ApiError(400, "Location must have valid coordinates [lng, lat]");
  }

  // Prevent duplicate shop by same owner
  const existingShop = await Shop.findOne({ owner });
  if (existingShop) {
    throw new ApiError(400, "You already own a shop");
  }

  const shopImagepath = req.files?.shopImages[0]?.path; 

  const shopImage = await uploadOnCloudinary(shopImagepath)

  if(!shopImage){
    throw new ApiError(400, "Image is required")
  }

  // Create shop
  const shop = await Shop.create({
    owner,
    shopName,
    address,
    contactDetails,
    shopImage:shopImage.url,
    location: {
      type: 'Point',
      coordinates: parsedLocation.coordinates
    },
    category
  });
  
  // Update user role to 'owner'
  await User.findByIdAndUpdate(owner, { role: "owner" });

  res.status(201).json({
    success: true,
    message: "Shop registered successfully",
    shop
  });
});
import Shop from "../models/shopschema.js";
import  User  from "../models/userschema.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import { uploadOnCloudinary } from "../utilities/cloudinary.js";
import Sale from "../models/saleschema.js";

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

  const shopImagepath = req.files?.shopImage[0]?.path; 

  const shopImage = await uploadOnCloudinary(shopImagepath)

  if(!shopImage){
    throw new ApiError(400, "Image is required")
  }

  // Create shop
  const shop = await Shop.create({
    owner:req.user?._id,
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

export const registerSales = asyncHandler(async (req, res) => {
  const { title, description, discount, startDate, endDate } = req.body;

  // ✅ Get userId from the authenticated user (set by verfiyUser middleware)
  const userId = req.user._id;

  // ✅ Validate required fields
  if (!title || !discount || !startDate || !endDate) {
    throw new ApiError(400, "Title, discount, start date, and end date are required");
  }

  // ✅ Check if the user owns a shop
  const shop = await Shop.findOne({ owner: userId });

  const saleImagePath = req.files?.saleImage[0]?.path;

  const saleImage = await uploadOnCloudinary(saleImagePath)

  if (!shop) {
    throw new ApiError(403, "You must own a shop to register a sale");
  }

  // ✅ Create the sale linked to the shop
  const sale = await Sale.create({
    shop: shop._id,
    title,
    description,
    image: saleImage.url,
    discount,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  // ✅ Respond with success
  res.status(201).json({
    success: true,
    message: "Sale registered successfully",
    sale,
  });
});


export const getShopFollowers = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get shop of the current logged-in owner
  const shop = await Shop.findOne({ owner: userId }).populate('followers', 'name email');
  if (!shop) throw new ApiError(404, "Shop not found");

  res.status(200).json(
    new ApiResponse(200, shop.followers, "Fetched followers of the shop")
  );
});

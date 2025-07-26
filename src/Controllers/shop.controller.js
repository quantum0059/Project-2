import Shop from "../models/shopschema.js";
import  User  from "../models/userschema.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import { uploadOnCloudinary } from "../utilities/cloudinary.js";
import Sale from "../models/saleschema.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { getCoordinatesFromAddress } from '../utilities/Geocode.js';


// export const registerShop = asyncHandler(async (req, res) => {
//   const {
//     shopName,
//     address,
//     contactDetails,
//     location,
//     category,
//   } = req.body;

//   const owner = req.user._id;

//   // Validation
//   if (!shopName || !address || !contactDetails || !location || !category) {
//     throw new ApiError(400, "All fields are required");
//   }

//   // Parse location if it's a string (e.g., sent as JSON string from frontend)
//   let parsedLocation;
//   try {
//     parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
//   } catch (error) {
//     throw new ApiError(400, "Invalid location format");
//   }

//   if (!parsedLocation.coordinates || parsedLocation.coordinates.length !== 2) {
//     throw new ApiError(400, "Location must have valid coordinates [lng, lat]");
//   }

//   // Prevent duplicate shop by same owner
//   const existingShop = await Shop.findOne({ owner });
//   if (existingShop) {
//     throw new ApiError(400, "You already own a shop");
//   }

//   const shopImagepath = req.files?.shopImage[0]?.path; 
//   const coverImagepath = req.files?.coverImage[0]?.path;

//   const shopImage = await uploadOnCloudinary(shopImagepath)
//   const coverImage = await uploadOnCloudinary(coverImagepath)

//   if (!shopImage || !coverImage) {
//   throw new ApiError(400, "Failed to upload images");
//  }

//   // Create shop
//   const shop = await Shop.create({
//     owner:req.user?._id,
//     shopName,
//     address,
//     contactDetails,
//     shopImage:shopImage.url,
//     coverImage:coverImage.url,
//     location: {
//       type: 'Point',
//       coordinates: parsedLocation.coordinates
//     },
//     category
//   });
  
//   // Update user role to 'owner'
//   await User.findByIdAndUpdate(owner, { role: "owner" });

//   res.status(201).json({
//     success: true,
//     message: "Shop registered successfully",
//     shop
//   });
// });

export const registerShop = asyncHandler(async (req, res) => {
  const {
    shopName,
    address,
    contactDetails,
    category,
  } = req.body;

  const owner = req.user._id;

  // ✅ Validation
  if (!shopName || !address || !contactDetails || !category) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ Prevent duplicate shop by same owner
  const existingShop = await Shop.findOne({ owner });
  if (existingShop) {
    throw new ApiError(400, "You already own a shop");
  }

  // ✅ Handle image upload
  const shopImagePath = req.files?.shopImage?.[0]?.path;
  const coverImagePath = req.files?.coverImage?.[0]?.path;

  const shopImage = await uploadOnCloudinary(shopImagePath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!shopImage || !coverImage) {
    throw new ApiError(400, "Failed to upload images");
  }

  // ✅ Get coordinates using address
  let coordinates;
  try {
    coordinates = await getCoordinatesFromAddress(address); // returns [lng, lat]
    if (!coordinates || !Array.isArray(coordinates)) {
      throw new Error("Invalid coordinates returned");
    }
  } catch (err) {
    console.error("Geocoding failed:", err.message);
    throw new ApiError(400, err.message || "Could not fetch coordinates from the address");
  }

  // ✅ Create shop
  const shop = await Shop.create({
    owner: req.user._id,
    shopName,
    address,
    contactDetails,
    shopImage: shopImage.url,
    coverImage: coverImage.url,
    location: {
      type: "Point",
      coordinates, // [lng, lat]
    },
    category,
  });

  // ✅ Update user role to 'owner'
  await User.findByIdAndUpdate(owner, { role: "owner" });

  res.status(201).json({
    success: true,
    message: "Shop registered successfully",
    shop,
  });
});

// export const registerSales = asyncHandler(async (req, res) => {
//   const { title, description, discount, startDate, endDate } = req.body;

//   // ✅ Get userId from the authenticated user (set by verfiyUser middleware)
//   const userId = req.user._id;

//   // ✅ Validate required fields
//   if (!title || !discount || !startDate || !endDate) {
//     throw new ApiError(400, "Title, discount, start date, and end date are required");
//   }

//   // ✅ Check if the user owns a shop
//   const shop = await Shop.findOne({ owner: userId });

//   const saleImagePath = req.files?.saleImage[0]?.path;

//   const saleImage = await uploadOnCloudinary(saleImagePath)

//   if (!shop) {
//     throw new ApiError(403, "You must own a shop to register a sale");
//   }
//    if (!saleImage?.url) {
//     throw new ApiError(400, "Failed to upload sale image");
//   }

//     const generateCoupon = req.body.generateCoupon === "true";

//   // ✅ Create the sale linked to the shop
//   const sale = await Sale.create({
//     shop: shop._id,
//     title,
//     description,
//     image: saleImage.url,
//     discount,
//     startDate: new Date(startDate),
//     endDate: new Date(endDate),
//     generateCoupon,
//   });

//   // ✅ Respond with success
//   res.status(201).json({
//     success: true,
//     message: "Sale registered successfully",
//     sale,
//   });
// });

export const registerSales = asyncHandler(async (req, res) => {
  const { title, description, discount, startDate, endDate } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!title || !discount || !startDate || !endDate) {
    throw new ApiError(400, "Title, discount, start date, and end date are required");
  }

  // Find the shop by owner
  const shop = await Shop.findOne({ owner: userId });
  if (!shop) {
    throw new ApiError(403, "You must own a shop to register a sale");
  }

  // Handle main poster image
  const saleImagePath = req.files?.saleImage?.[0]?.path;
  if (!saleImagePath) {
    throw new ApiError(400, "Sale poster image is required");
  }
  const saleImage = await uploadOnCloudinary(saleImagePath);
  if (!saleImage?.url) {
    throw new ApiError(400, "Failed to upload sale image");
  }

  // Handle product gallery images (up to 7)
  const productImagePaths = req.files?.productImages?.map(f => f.path) || [];
  const uploadPromises = productImagePaths.map(path => uploadOnCloudinary(path));
  const productImageResults = await Promise.all(uploadPromises);
  const productImageUrls = productImageResults
    .filter(result => result?.url)
    .map(result => result.url)
    .slice(0, 7); // enforce max 7 images

  // Optional: validation if you require at least one gallery image
  // if (productImageUrls.length < 1) {
  //   throw new ApiError(400, "At least one product image is required");
  // }

  const generateCoupon = req.body.generateCoupon === "true";

  // Create the sale
  const sale = await Sale.create({
    shop: shop._id,
    title,
    description,
    image: saleImage.url,
    productImages: productImageUrls,
    discount,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    generateCoupon,
  });

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

export const getAllShop = asyncHandler(async (req, res) => {
  const userId = req.user?._id
  if(!userId){
    throw new ApiError(401,"No logged in User")
  }

  const shops = await Shop.find({owner: userId}).sort({createdAt:-1})

  return res
         .status(200)
         .json(new ApiResponse(200, shops, "shops fetched Successfully"))
})

// controllers/shop.controller.js



export const getShopInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const shop = await Shop.findById(id)
      .populate("owner", "name email phone") // Get owner's basic info
      .populate("followers", "name");        // Get follower names only

    if (!shop) {
      throw new ApiError(404, "Shop not found");
    }

    const sales = await Sale.find({ shop: id }); // Find sales by shop

    return res.status(200).json(
      new ApiResponse(200, { shop, sales }, "Shop info fetched successfully")
    );
  } catch (err) {
    console.error("❌ Failed to get shop info:", err);
    throw new ApiError(500, "Internal Server Error: " + err.message);
  }
});



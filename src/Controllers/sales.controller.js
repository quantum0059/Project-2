import mongoose from "mongoose";
import Sale from "../models/saleschema.js";
import Shop from "../models/shopschema.js";
import User from "../models/userschema.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";

// ==========================
// @desc   Get all sales
// @route  GET /api/sales
// ==========================
// export const getAllSales = asyncHandler(async (req, res) => {
//   const { category, search } = req.query;//req.query is used for seraching and filtering

//   const query = {};

//   // filter by category → assumes Shop has a category field
//   if (category) {
//     const shopsInCategory = await Shop.find({ category }).select('_id');
//     query.shop = { $in: shopsInCategory.map(shop => shop._id) };
//   }

//   // filter by sale title
//   if (search) {
//     const words = search.trim().split(/\s+/); // plsit search into words

//     query.$and = words.map((word) => ({
//       title: {$regex: word, $options:"i"}
//     }));
//   }

//   const sales = await Sale.find(query)
//     .populate('shop', 'shopName category')
//     .sort({ startDate: -1 });

//   res.status(200).json(
//     new ApiResponse(200, sales, "Fetched sales successfully")
//   );
// });

// export const getAllSales = asyncHandler(async (req, res) => {
//   const { category, search, latitude, longitude } = req.query;

//   const lon = parseFloat(longitude);
//   const lat = parseFloat(latitude);

//   if (!lat || !lon) {
//     return res.status(400).json({ success: false, message: "Latitude & Longitude required" });
//   }

//   const pipeline = [
//     {
//       $geoNear: {
//         near: { type: "Point", coordinates: [lon, lat] },
//         distanceField: "distance", // in meters
//         maxDistance: 10000, // 10 km
//         spherical: true
//       }
//     },
//     {
//       $lookup: {
//         from: "sales",
//         localField: "_id",
//         foreignField: "shop",
//         as: "sales"
//       }
//     },
//     { $unwind: "$sales" }
//   ];

//   if (category) {
//     pipeline.push({ $match: { category } });
//   }

//   if (search) {
//     const words = search.trim().split(/\s+/).map(word => ({
//       "sales.title": { $regex: word, $options: "i" }
//     }));
//     pipeline.push({ $match: { $and: words } });
//   }

//   const results = await Shop.aggregate(pipeline);

//   const sales = results.map(r => ({
//     ...r.sales,
//     shop: {
//       shopName: r.shopName,
//       category: r.category,
//       distance: r.distance // in meters
//     }
//   }));

//   res.status(200).json(
//     new ApiResponse(200, sales, "Fetched sales successfully")
//   );
// });

// ==========================
// @desc   Get sale by ID & increment views
// @route  GET /api/sales/:saleId
// ==========================

export const getAllSales = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  // ✅ Get user's location from DB
  const user = await User.findById(userId).select("location");
  if (!user || !user.location || !user.location.coordinates) {
    return res
      .status(400)
      .json({ success: false, message: "User location not available" });
  }

  const [lon, lat] = user.location.coordinates;

  const { category, search } = req.query;

  // 📍 Geospatial + sales pipeline
  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lon, lat] },
        distanceField: "distance",
        maxDistance: 10000, // 10 km
        spherical: true,
      },
    },
    {
      $lookup: {
        from: "sales",
        localField: "_id",
        foreignField: "shop",
        as: "sales",
      },
    },
    { $unwind: "$sales" },
  ];

  // 🧃 Optional filter: category
  if (category) {
    pipeline.push({ $match: { category } });
  }

  // 🧠 Optional filter: search keyword in sale titles
  if (search) {
    const words = search
      .trim()
      .split(/\s+/)
      .map((word) => ({
        "sales.title": { $regex: word, $options: "i" },
      }));
    pipeline.push({ $match: { $and: words } });
  }

  // 🔎 Run aggregation
  const results = await Shop.aggregate(pipeline);

  // 🧹 Format final response
  const sales = results.map((r) => ({
    ...r.sales,
    shop: {
      _id: r._id,
      shopName: r.shopName,
      category: r.category,
      distance: r.distance, // in meters
      address: r.address, 
    },
  }));

  res
    .status(200)
    .json(
      new ApiResponse(200, sales, "Fetched sales within 10km successfully")
    );
});

export const getSaleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid sale ID");
  }

  const sale = await Sale.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate("shop", "shopName category");

  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, sale, "Fetched sale and incremented views"));
});

export const updateSaleByShopkeeper = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new ApiError(400, "Invalid sale ID");
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "No update data provided");
  }

  const shop = await Shop.findOne({ owner: userId });
  if (!shop) throw new ApiError(404, "Shop not found");

  const sale = await Sale.findOne({ _id: saleId, shop: shop._id });
  if (!sale) throw new ApiError(403, "Unauthorized to update this sale");

  if ("generateCoupon" in req.body) {
    req.body.generateCoupon =
      req.body.generateCoupon === "true" || req.body.generateCoupon === true;
  }

  const updatedSale = await Sale.findByIdAndUpdate(saleId, req.body, {
    new: true,
    runValidators: true,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedSale, "Sale updated successfully"));
});

export const getSalesForShopkeeper = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Find shop owned by this user
  const shop = await Shop.findOne({ owner: userId });
  if (!shop) {
    throw new ApiError(404, "Shop not found for this user");
  }

  // 2. Find sales for this shop
  const sales = await Sale.find({ shop: shop._id }).sort({ startDate: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, sales, "Fetched all sales for this shopkeeper"));
});

import mongoose from "mongoose";
import Sale from "../models/saleschema.js";
import Shop from "../models/shopschema.js";
import { asyncHandler } from "../utilities/asyncHandeler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";


// ==========================
// @desc   Get all sales
// @route  GET /api/sales
// ==========================
export const getAllSales = asyncHandler(async (req, res) => {
  const { category, search } = req.query;//req.query is used for seraching and filtering

  const query = {};

  // filter by category → assumes Shop has a category field
  if (category) {
    const shopsInCategory = await Shop.find({ category }).select('_id');
    query.shop = { $in: shopsInCategory.map(shop => shop._id) };
  }

  // filter by sale title
  if (search) {
    const words = search.trim().split(/\s+/); // plsit search into words

    query.$and = words.map((word) => ({
      title: {$regex: word, $options:"i"}
    }));
  }

  const sales = await Sale.find(query)
    .populate('shop', 'name category')
    .sort({ startDate: -1 });

  res.status(200).json(
    new ApiResponse(200, sales, "Fetched sales successfully")
  );
});


// ==========================
// @desc   Get sale by ID & increment views
// @route  GET /api/sales/:saleId
// ==========================
export const getSaleById = asyncHandler(async (req, res) => {
  const { saleId } = req.params;

  // validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new ApiError(400, "Invalid sale ID");
  }

  const sale = await Sale.findByIdAndUpdate(
    saleId,
    { $inc: { views: 1 } },
    { new: true }
  ).populate('shop', 'name category');

  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }

  res.status(200).json(
    new ApiResponse(200, sale, "Fetched sale and incremented views")
  );
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

  const updatedSale = await Sale.findByIdAndUpdate(saleId, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json(
    new ApiResponse(200, updatedSale, "Sale updated successfully")
  );
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

  res.status(200).json(
    new ApiResponse(200, sales, "Fetched all sales for this shopkeeper")
  );
});


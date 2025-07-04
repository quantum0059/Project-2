import mongoose from "mongoose";
import Sale from "../models/saleModel.js";
import Shop from "../models/shopModel.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


// ==========================
// @desc   Get all sales
// @route  GET /api/sales
// ==========================
export const getAllSales = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  const query = {};

  // filter by category → assumes Shop has a category field
  if (category) {
    const shopsInCategory = await Shop.find({ category }).select('_id');
    query.shop = { $in: shopsInCategory.map(shop => shop._id) };
  }

  // filter by sale title
  if (search) {
    query.title = { $regex: search, $options: "i" };
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
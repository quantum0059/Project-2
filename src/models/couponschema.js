import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // ensures no two users get the same coupon
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // references the user who owns this coupon
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop', // the shop that accepts this coupon
    required: true,
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale', // the sale offer related to this coupon
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false, // updated to true when the coupon is redeemed
  },
  expiresAt: {
    type: Date,
    required: true, // expiry logic: coupon is invalid after this date
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  couponMessage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export const Coupon = mongoose.model('Coupon', couponSchema);

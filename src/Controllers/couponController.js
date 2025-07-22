// controllers/couponController.js
import {Coupon} from '../models/couponschema.js';
import QRCode from 'qrcode';
import Sale from "../models/saleschema.js";

export const generateCoupon = async (req, res) => {
  const { shopId, saleId } = req.body;
  const userId = req.user._id;

  try {
    // Check if a coupon already exists for this user and sale
    const existingCoupon = await Coupon.findOne({ user: userId, sale: saleId });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon already generated for this sale.' });
    }

    // Generate unique coupon code
    const code = `CPN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Set expiry to 7 days from now (optional logic)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sale = await Sale.findById(saleId);
    const newCoupon = new Coupon({
      code,
      user: userId,
      shop: shopId,
      sale: saleId,
      expiresAt,
      couponMessage: sale?.couponMessage ?? ""
    });

    await newCoupon.save();

    // Generate QR code as data URL
    const qrData = JSON.stringify({ code, user: userId.toString() }); // You can customize this
    const qrImage = await QRCode.toDataURL(qrData);

    res.status(201).json({
      message: 'Coupon generated successfully.',
      code,
      couponMessage: sale?.couponMessage ?? "", 
      qrImage, // base64 image of QR
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating coupon', error });
  }
};

export const redeemCoupon = async (req, res) => {
  const { code, userId, shopId } = req.body; // 👈 also expect shopId (scanning shop)

  try {
    // Step 1: Find the coupon
    const coupon = await Coupon.findOne({ code, user: userId });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found or invalid.' });
    }

    // Step 2: Check shop access
    if (coupon.shop.toString() !== shopId) {
      return res.status(403).json({ message: '⚠️ Coupon does not belong to this shop. Access denied.' });
    }

    // Step 3: Check expiry
    if (new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: 'Coupon has expired.' });
    }

    // Step 4: Check reuse
    if (coupon.isUsed) {
      return res.status(400).json({ message: 'Coupon already used.' });
    }

    // Step 5: Mark as used
    coupon.isUsed = true;
    await coupon.save();

    res.status(200).json({
      message: '✅ Coupon redeemed successfully',
      saleId: coupon.sale,
      userId: coupon.user,
      shopId: coupon.shop,
      code: coupon.code,
    });
  } catch (error) {
    console.error("Redeem Error:\n", error);
    res.status(500).json({ message: 'Error redeeming coupon', error });
  }
};

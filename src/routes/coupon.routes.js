// routes/couponRoutes.js
import express from 'express';
import { generateCoupon, redeemCoupon } from '../Controllers/couponController.js';
import { verfiyUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/generate', verfiyUser, generateCoupon);
router.post("/redeem", verfiyUser, redeemCoupon);

export default router;

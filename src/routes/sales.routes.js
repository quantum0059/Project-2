import {
  getAllSales,
  getSaleById,
  updateSaleByShopkeeper,
  getSalesForShopkeeper
} from "../Controllers/sales.controller.js";

import { Router } from "express";
import { verfiyUser } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/getallsales").get(verfiyUser, getAllSales);
router.route("/allsales").get(verfiyUser, getSalesForShopkeeper);

// Now put the dynamic route at the bottom
router.route("/:id").get(getSaleById);
router.route("/:id").put(verfiyUser, updateSaleByShopkeeper);


export default router;

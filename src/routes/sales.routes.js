import {
  getAllSales,
  getSaleById,
  updateSaleByShopkeeper,
  getSalesForShopkeeper
} from "../Controllers/sales.controller.js";

import { Router } from "express";
import { verfiyUser } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/getallsales").get(getAllSales);
router.route("/:id").get(getSaleById);
router.route("/:id").put(verfiyUser, updateSaleByShopkeeper);
router.route("/allsales").get(verfiyUser, getSalesForShopkeeper);

export default router;

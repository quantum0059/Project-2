import { Router } from "express";

import {
  registerShop,
  registerSales,
  getShopFollowers,
  getAllShop,
  getShopInfo
} from "../Controllers/shop.controller.js";

import { upload } from "../middleware/multer.middleware.js";
import { verfiyUser } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/shopregister").post(
  verfiyUser,
  upload.fields([
    { name: "shopImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerShop
);

router.route("/registerSales").post(
  verfiyUser,

  upload.fields([
    {
      name: "saleImage",
      maxCount: 1,
    },
    { name: "productImages", maxCount: 7 }
  ]),
  registerSales
);
router.route("/shopfollowers").get(verfiyUser, getShopFollowers);
router.route("/getallshops").get(verfiyUser, getAllShop);
router.route("/:id/getshopinfo").get(getShopInfo)
export default router;

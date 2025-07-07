import {Router} from "express";
import { registerShop, registerSales } from "../Controllers/shop.controller.js";
import {upload} from "../middleware/multer.middleware.js"
import {verfiyUser} from "../middleware/auth.middleware.js"

const router = Router()

router.route("/shopregister").get(verfiyUser, (req, res) => {
    res.render("shop")
}).post(
    verfiyUser,
    upload.fields([
        {
            name: "shopImage",
            maxCount: 1
        }
    ]),
    registerShop
)
router.route("/registerSales").post(verfiyUser, registerSales)
export default router
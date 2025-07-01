import {Router} from "express";
import { registerShop } from "../Controllers/shop.controller.js";
import {upload} from "../middleware/multer.middleware.js"
import {verfiyUser} from "../middleware/auth.middleware.js"
const router = Router()

router.route("/shopregister").post(
    upload.fields([
        {
            name: "shopImage",
            maxCount: 1
        }
    ]),
    verfiyUser,registerShop
)

export default router
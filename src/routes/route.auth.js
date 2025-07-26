import express from "express";
import {
  registerUser,
  loginUser,
  logOutUser,
  changeUserPassword,
  refreshAccessToken,
  updateAccountDetail,
  followShop,
  unfollowShop,
  getUserCart,
  getFollowedShops,
  googleLogin,
  userProfile,
  googleRegister,
} from "../Controllers/login.controller.js";
import { verfiyUser } from "../middleware/auth.middleware.js";
const router = express.Router();

// Base route (GET /api/v1/auth)
// router.get("/", (req, res) => {
//     res.render("login"); // or just res.send("Auth works!")
// });

router
  .route("/login")
  .get((req, res) => {
    res.render("login"); // render login.pug
  })
  .post(loginUser);

router
  .route("/register")
  .get((req, res) => {
    res.render("signup");
  })
  .post(registerUser);

router.route("/logout").post(verfiyUser, logOutUser);
router.route("/google-login").post(googleLogin);
router.route("/google-register").post(googleRegister)
router.route("/changepassword").post(verfiyUser, changeUserPassword);
router.route("/refreshaccesstoken").post(verfiyUser, refreshAccessToken);
router.route("/updateaccount").post(verfiyUser, updateAccountDetail);
router.route("/profile").get(verfiyUser, userProfile)
router.route("/followshop").post(verfiyUser, followShop);
router.route("/unfollowshop").post(verfiyUser, unfollowShop);
router.route("/usercart").get(verfiyUser, getUserCart);
router.route("/followedshop").get(verfiyUser, getFollowedShops);

// router.get("/forgot-password", (req, res) => {
//     res.send("Password reset page coming soon!");
// });

export default router;

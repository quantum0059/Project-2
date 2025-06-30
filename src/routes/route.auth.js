import express from "express";
import {registerUser, loginUser} from "../Controllers/login.controller.js"
const router = express.Router();

// Base route (GET /api/v1/auth)
// router.get("/", (req, res) => {
//     res.render("login"); // or just res.send("Auth works!")
// });

router.route("/login").post(loginUser)


router.route("/register").post(registerUser)
// router.get("/forgot-password", (req, res) => {
//     res.send("Password reset page coming soon!");
// });

export default router;

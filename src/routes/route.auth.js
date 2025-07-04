import express from "express";
import {registerUser, loginUser} from "../Controllers/login.controller.js"
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

router.route("/register").get((req, res) => {
    res.render("signup")
}).post(registerUser)


// router.get("/forgot-password", (req, res) => {
//     res.send("Password reset page coming soon!");
// });

export default router;

import express from "express";
const router = express.Router();

// Base route (GET /api/v1/auth)
// router.get("/", (req, res) => {
//     res.render("login"); // or just res.send("Auth works!")
// });

router.get("/login", (req, res) => {
    res.render("login");
});

router.get("/signup", (req, res) => {
    res.render("signup");
});
router.get("/forgot-password", (req, res) => {
    res.send("Password reset page coming soon!");
});

export default router;

// import User from "../models/userschema.js";

// // ------------------ SIGNUP ------------------
// export const registerUser = async (req, res) => {
//     const { name, email, password, location } = req.body;

//     try {
//         // Check if user already exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(409).json({ message: "User already exists" });
//         }

//         // Create new user
//         const newUser = new User({
//             name,
//             email,
//             password,
//             location
//         });

//         await newUser.save();

//         const accessToken = newUser.generateAccessToken();
//         const refreshToken = newUser.generateRefreshToken();
// // 
//         res.status(201).json({
//             message: "User registered successfully",
//             accessToken,
//             refreshToken,
//             user: {
//                 id: newUser._id,
//                 name: newUser.name,
//                 email: newUser.email,
//                 role: newUser.role
//             }
//         });

//     } catch (error) {
//         console.error("Signup error:", error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// };


// // ------------------ LOGIN ------------------
// export const loginUser = async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         const isMatch = await user.isPasswordCorrect(password);
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         const accessToken = user.generateAccessToken();
//         const refreshToken = user.generateRefreshToken();

//         res.status(200).json({
//             message: "Login successful",
//             accessToken,
//             refreshToken,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role
//             }
//         });

//     } catch (error) {
//         console.error("Login error:", error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// };

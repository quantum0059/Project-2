import {ApiError} from "../utilities/ApiError.js"
import {asyncHandler} from "../utilities/asyncHandeler.js"
import jwt from "jsonwebtoken"
import User from "../models/userschema.js"

export const verfiyUser = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        console.log(token)
        if(!token){
            throw new ApiError(401, "authorization error")
        }
        
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decoded?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Credentail")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid Access Token")
    }

})

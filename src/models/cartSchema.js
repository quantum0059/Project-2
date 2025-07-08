import mongoose,{Schema} from "mongoose";

const cartSchema = new Schema(
    {
       sales:[
        {
         type: Schema.Types.ObjectId,
         ref:"Sale"
        }
    ],
       user:{
          type:Schema.Types.ObjectId,
          ref: "User",
          required: true,
          unique:true
       }
    },{timestamps: true}
)

export const Cart = mongoose.model("Cart", cartSchema);
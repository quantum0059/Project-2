import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
    },
    productImages: [
      // Array for multiple product images (up to 7)
      {
        type: String,
        trim: true,
      }
    ],
    discount: {
      type: Number,
      required: true,
      min: 1,
      max: 100, // Assuming discount is in percentage
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    generateCoupon: {
      type: Boolean,
      default: false,
      required:true
    },
  },
  { timestamps: true }
);

const Sale = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
export default Sale;

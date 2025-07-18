import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  contactDetails: {
    type: String,
    required: true
  },
  location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
},
  category: {
    type: String,
    enum: ['clothing', 'electronics', 'grocery', 'others'],
    required: true
  },
  shopImage:{
      type: String,
      required: true
  }, 
  coverImage:{
    type:String,
    required:true
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
]
}, { timestamps: true });

shopSchema.index({ location: "2dsphere" });

const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
export default Shop;

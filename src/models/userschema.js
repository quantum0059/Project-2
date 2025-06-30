import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6
  },
  refreshToken: {
    type: String
  },

  role: {
    type: String,
    enum: ['user', 'owner'],
    default: 'user'
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  followingShops: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    }
  ]
}, {
  timestamps: true
});
userSchema.pre("save", async function (next) {
  if(!this.isModified("password")) return next;
  this.password = bcrypt.hash(this.password, 10)
  next()
}) // we have to give context f the users schema t encrypt it and pre is mongose hook

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

userSchema.method.generateAccessToken = function() {
 return jwt.sign(
      {//this is payload
          _id: this._id,
          email:this.email,
          username:this.username,
          fullname:this.fullname
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
  )
}
userSchema.method.generateRefreshToken = function() {
  return jwt.sign(
      {//this is payload
          _id: this._id
     },
      process.env.REFRESH_TOKEN_SECRET,
      {
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
)}
// ✅ Add 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

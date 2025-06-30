import dotenv from "dotenv";
dotenv.config(); 
import connectDB from "./db/index.js";
import {app} from './app.js';


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})//here now app is connected to server
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})


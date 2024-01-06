// require('dotenv').config({path: "./env"});
import connectDB from "./db/database.db.js";
import dotenv from "dotenv";
connectDB();

dotenv.config({
    path: "./env"
});

/*import { DB_NAME } from "./constants";
import express from "express";
const app = express();

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("Error is ", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log("Server is running at port ", process.env.PORT);
        })
    } catch(error) {
        console.error("Error is ", error);
        throw error;
    }
})();*/
// require('dotenv').config({path: "./env"});
import connectDB from "./db/database.db.js";
import dotenv from "dotenv";
import { app } from "./app.js"

dotenv.config({
    path: "./env"
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((error) => {
    console.log("MongoDB connection failed !!!", error.message);
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
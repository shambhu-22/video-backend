import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.v2.uploader.upload(localFilePath,
            { resource_type: "auto" }, 
            function(error, result) {console.log(result); });
            console.log("File upload success", response.url);
            return response;
    } catch(error) {
        fs.unlinkSync(localFilePath)// remove the locally saved temp file
        return null;
    }
}
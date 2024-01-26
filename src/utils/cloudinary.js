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
        const response = await cloudinary.uploader.upload(localFilePath,
            { resource_type: "auto" });
            fs.unlinkSync(localFilePath);// remove on success
            return response;
    } catch(error) {
        fs.unlinkSync(localFilePath)// remove the locally saved temp file when err occurs
        return null;
    }
}

const deleteOnCloudinary = async (publicUrl) => {
    try {
        const deleteFileResponse = await cloudinary.uploader.destroy(publicUrl, (result) => {
            console.log("result of deletion of file on cloudinary: ", result);
        })
    } catch(err) {
        console.error("Some error occured during deleting file on cloudinary", err.message);
    }
}

export {
    deleteOnCloudinary, 
    uploadOnCloudinary
};
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }
    await deleteOnCloudinary(req.user?.avatar);
    const cloudinaryUrl = await uploadOnCloudinary(avatarLocalPath);

    if(!cloudinaryUrl.url) {
        throw new ApiError(400, "Error while updating Avatar file");
    }

    const userDetails = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: cloudinaryUrl.url
            }
        },
        {new: true}
    ).select("-password");
    
    return res
            .status(200)
            .json(new ApiResponse(200, userDetails, "Avatar file updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }
    await deleteOnCloudinary(req.user?.coverImage);
    const cloudinaryUrl = await uploadOnCloudinary(coverImageLocalPath);

    if(!cloudinaryUrl.url) {
        throw new ApiError(400, "Error while updating cover image file");
    }

    const userDetails = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: cloudinaryUrl.url
            }
        },
        {new: true}
    ).select("-password");
    
    return res
            .status(200)
            .json(new ApiResponse(200, userDetails, "Cover image file updated successfully"));
});

export {
    updateUserAvatar,
    updateUserCoverImage
}
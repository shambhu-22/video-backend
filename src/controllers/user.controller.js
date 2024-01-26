import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        console.log("access tolen", accessToken);
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken};
    } catch(err) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }

}

const registerUser = asyncHandler( async (req, res) => {
    const {email, fullName, password, userName} = req.body;
    if(
        [email, fullName, userName, password].some((x) => x?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if(existedUser) 
    {
       throw new ApiError(409, "User with email or username already exists");
    }

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files?.avatar.length > 0) {
        avatarLocalPath = req.files?.avatar[0].path;
    }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files?.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0].path;
    }


    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("response from cloudinary: ", avatar);
    if(!avatar) {
        throw new ApiError(400, "Avatar file upload error, is required");
    }

    const user = await User.create({
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        userName: userName.toLowerCase(),
    });
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while creatin the user");
    }

    res.status(200).json(
            new ApiResponse(200, createdUser, "User created successfully")
        );
})

const loginUser = asyncHandler( async (req, res) => {
    const {email, password, userName} = req.body;
    if(!email && !userName) {
        throw new ApiError(400, "Either email or username are required.");
    }

    const existingUser = await User.findOne({
        $or: [{userName}, {email}]
    });

    if(!existingUser) {
        throw new ApiError(404, "User does not exist kindly register");
    }

    const passCorrect = await existingUser.isPasswordCorrect(password);
    if(!passCorrect) {
        throw new ApiError(401, "Incorect credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existingUser._id);
    
    const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            }, "User logged in successfully.")
        )
})

const logOutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );
    
    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(
                new ApiResponse(200, {}, "User Logged Out")
            )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedIncomingToken = jwt.verify(incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET);
        
    
        const user = await User.findById(decodedIncomingToken?._id);
        if(!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        };
        const {accessToken, newRefreshToken} = await this.generateAccessAndRefreshTokens(user._id);
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200,
                { accessToken, refreshToken: newRefreshToken }, "access token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
            .status(200)
            .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName, 
                email
            }
        },
        { new : true } // this tells info after this update executes
    ).select("-password");

    return res
            .status(200)
            .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {userName} = req.params;
    if(!userName?.trim()) {
        throw new ApiError(400, "User name is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {// how many subscribers user has
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {// to how many users has subscribed
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ]);
    console.log("aggregate value: ", channel);
    if(!channel?.length) {
        throw new ApiError(400, "Channel does not exists");
    }
    
    return res
            .status(200)
            .json(new ApiResponse(200, channel[0], "User's channel data successfully found"));
});

const getUserHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchedHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // try to use this pipeline outside this
                            pipeline: [
                                {
                                    $project: {
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                //$arrayElemAt: ["$owner", 0] try this also
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
            .status(200)
            .json(new ApiResponse(200, user[0].watchHistory, "Watch history got successfully"));
});

export {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserHistory,
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    updateAccountDetails
};
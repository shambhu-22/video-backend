import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken
};
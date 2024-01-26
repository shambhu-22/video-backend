import { Router } from "express";
import { 
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserHistory,
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    updateAccountDetails 
} from "../controllers/user.controller.js";
import { 
    updateUserAvatar,
    updateUserCoverImage 
} from "../controllers/updatefiles.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const userRoutes = Router();

userRoutes.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    );

userRoutes.route("/login").post(loginUser);

//secured routes section
userRoutes.route("/logout").post(verifyJWT, logOutUser)
userRoutes.route("/refresh-token").post(refreshAccessToken);
userRoutes.route("/change-password").post(verifyJWT, changeCurrentPassword);
userRoutes.route("/current-user").get(verifyJWT, getCurrentUser);
userRoutes.route("/update-account").patch(verifyJWT, updateAccountDetails);// post updates all details patch only few

userRoutes.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
userRoutes.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// taking from params
userRoutes.route("/c/:userName").get(verifyJWT, getUserChannelProfile);// /c can be /channel
userRoutes.route("/history").get(verifyJWT, getUserHistory);

export {userRoutes};
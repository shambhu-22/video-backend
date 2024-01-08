import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controller.js";

const userRoutes = Router();

userRoutes.route("/register").get(registerUser);

//userRoutes.route("/login").post(loginUser);


export {userRoutes};
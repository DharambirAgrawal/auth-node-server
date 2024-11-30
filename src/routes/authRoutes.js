import express from "express";

import { register,verifyEmail,resendEmail,login,forgotPassword, resetPassword,resetPasswordUi, suspendAccount, logout} from "../controllers/authcontroller.js";
import { loginMiddleware } from "../middlewares/authMiddleware.js";

const AuthRouter = express.Router();



export const authRouter = AuthRouter
.post("/register", register)
.get("/register/:token", verifyEmail)
.post("/resend/email", resendEmail)
.post("/login",loginMiddleware,login)
.post("/forgetpassword",forgotPassword )  
.get("/resetpassword/:token",resetPasswordUi)   //static file for reset password
.post("/reset/password",resetPassword)
.get("/suspend/user/:token",suspendAccount)
.get("/logout",logout)



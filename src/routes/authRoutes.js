import express from "express";

import { register,verifyEmail,resendEmail} from "../controllers/authcontroller.js";


const AuthRouter = express.Router();



export const authRouter = AuthRouter
.post("/register", register)
.get("/register/:token", verifyEmail)
.post("/resend/email", resendEmail)



import express from "express";

import { register} from "../controllers/authcontroller.js";
import { registerMiddleware } from "../middlewares/authMiddleware.js";

const AuthRouter = express.Router();



export const authRouter = AuthRouter
.post("/register", register)
.get("/register/:token", registerMiddleware, register);


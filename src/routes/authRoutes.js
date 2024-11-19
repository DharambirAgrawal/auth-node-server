import express from "express";

import { register} from "../controllers/authcontroller.js";

const AuthRouter = express.Router();



export const authRouter = AuthRouter
.post("/register", register)


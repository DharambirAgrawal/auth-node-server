import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "./prismaMiddleware.js"
import { validateEmail } from "../utils/utils.js";
import { decodeToken, generateToken } from "../utils/jwtUtils.js"



export const loginMiddleware=asyncHandler((req,res,next)=>{ 
    const { metaData } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!metaData || !token) {
        return next()
      }
    // console.log(token)
    // console.log(metaData)

    next()
})
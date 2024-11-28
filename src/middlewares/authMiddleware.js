import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "./prismaMiddleware.js"
import { validateEmail } from "../utils/utils.js";
import { decodeToken, generateToken } from "../utils/jwtUtils.js"



export const loginMiddleware = asyncHandler(async (req, res, next) => {
  const { metaData } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!metaData || !token) {
    return next()
  }
  console.log(token)

  const { email, sessionId, type } = await decodeToken(token, process.env.TOKEN_SECRET)
  console.log(email, sessionId, type)

  // if it is not refresh token
  // if (type != "refresh" || metaData.sessionId != sessionId) {
  //   return next()
  // }


  const user = await prisma.user.findUnique({
    where: { email: email },
    select: {
        sessions: {
            where: {
                sessionId: sessionId
            },
            select: {
                isRevoked:true,
                expiresAt:true,
                metadata: {
                    select: {
                        platform: true,
                        userAgent: true,
                        browser: true,
                        language: true,
                        ip: true,
                        deviceFingerprint: true,
                        timezoneOffset: true,
                    },
                },
            },
        },
    },
});

if(!user){
  throw new AppError('Session not found', 500);
}


if((user.sessions[0].expiresAt.getTime() < Date.now()) || (user.sessions[0].isRevoked)){
  // TODO: delete that session from DB
  console.log('Expired')

}

  return res.status(200).json({
    status: "failed",
    message: "Reset password!"
  });

  next()
})
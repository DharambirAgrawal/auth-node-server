import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "./prismaMiddleware.js"
import { decodeToken, generateToken } from "../utils/jwtUtils.js"



export const loginMiddleware = asyncHandler(async (req, res, next) => {
  const { metaData } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!metaData || !token) {
    return next()
  }


  const { email, sessionId, type } = await decodeToken(token, process.env.TOKEN_SECRET)

  // checking type
  // if it is not refresh token
  if (type != "refresh" || metaData.sessionId != sessionId) {
    return next()
  }

  //check if session and user exists
  const user = await prisma.user.findUnique({
    where: { email: email },
    select: {
      sessions: {
        where: {
          sessionId: sessionId
        },
        select: {
          isRevoked: true,
          expiresAt: true,
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

  if (!user) {
    throw new AppError('Session not found', 500);
  }

  //check if expired or revoked session 
  const { platform, userAgent, browser } = user.sessions[0].metadata
  if ((user.sessions[0].expiresAt.getTime() < Date.now()) || (user.sessions[0].isRevoked)) {
    await prisma.session.delete({
      where: { sessionId: sessionId }, // Specify the session ID to delete
    });
    throw new AppError('Token Expired!', 400);

  }

  //check for metaData
  if (metaData.platform != platform || metaData.userAgent != userAgent || metaData.browser != browser) {
    await prisma.session.delete({
      where: { sessionId: sessionId }, // Specify the session ID to delete
    });
    throw new AppError('Invalid Credentials!', 400);
  }

  const payload = {
    email: email,
    sessionId: sessionId
  }
//create new access token
  const accessToken = generateToken(payload, process.env.TOKEN_SECRET)

  //updating the session and MetaData
  const updatedSession = await prisma.user.update({
    where: { email: email },
    data: {
      sessions: {
        update: {
          where: { sessionId: sessionId }, // Specify which session to update
          data: {
            lastActiveAt: new Date(),
            accessToken: accessToken,
            metadata: {
              update: {
                language: metaData.language,
                ip: metaData.ip,
                timezoneOffset: parseInt(metaData.timezoneOffset)
              }
            }
          }
        }
      }
    },
  });

  if(!updatedSession){
    throw new AppError('Server Error!', 500);
  }

   //sending token in authorization token
   res.setHeader('Authorization', `Bearer ${accessToken}`);

  return res.status(200).json({
    status: "success",
    sessionId:sessionId
  });

})
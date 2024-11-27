// import {prisma} from "../../app.js"

import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../middlewares/prismaMiddleware.js"
import { validateEmail } from "../utils/utils.js";
import { decodeToken, generateToken, generateUniqueId } from "../utils/jwtUtils.js"
import { sendEmail } from "../services/emailService.js";
import { VERIFY_EMAIL_MESSAGE } from "../messages/emailMessage.js";
import { comparePasswords } from "../utils/utils.js";

//register ---->
export const register = asyncHandler(async (req, res) => {

  const { name, email, password } = req.body


  if (!name || !email || !password) {
    throw new AppError('Resource not found', 400);
  }

  //validating email
  if (!validateEmail(email)) {
    throw new AppError('Invalid Email!', 400);
  }

  //Checking if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email }, // Use your unique field here, such as email
  });


  if (existingUser) {
    throw new AppError('User already Exists', 400);
  }

  //Creating new user
  const newUser = await prisma.user.create({
    data: {
      name: name,
      email: email,
      password: password, // Make sure to hash the password before saving it
    },
  });




  res.status(200).json({
    message: "success"
  })
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params

  if (!token) {
    throw new AppError('Resource not found', 400);
  }
  const { email } = decodeToken(token, process.env.VERIFY_EMAIL_SECRET)

  if (!email) {
    throw new AppError('Server Error Try again!', 500);
  }
  const updateUser = await prisma.user.update({
    where: {
      email: email,
      verificationToken: token
    },
    data: {
      isEmailVerified: true,
      verificationToken: null,
      accountStatus: "active"
    },
  })

  if (!updateUser) {
    throw new AppError('Server Error Try again!', 500);
  }


  res.status(200).json({
    message: "success"
  })
})

export const resendEmail = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    throw new AppError('Resource not found', 400);
  }

  //validating email
  if (!validateEmail(email)) {
    throw new AppError('Invalid Email!', 400);
  }

  //Checking if user exists
  const payload = {
    email: email
  }
  const token = generateToken(payload, process.env.VERIFY_EMAIL_SECRET)

  const updateUser = await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      verificationToken: token
    },
  })

  await sendEmail(email, VERIFY_EMAIL_MESSAGE(token))


  if (!updateUser) {
    throw new AppError('Server Error Try again!', 500);
  }

  res.status(200).json({
    message: "success"
  })

})

// <-------- end of register 


export const login = asyncHandler(async (req, res) => {

  const { email, password, metaData } = req.body;
  const {
    platform,
    userAgent,
    browser,
    language,
    ip,
    deviceFingerprint,
    timezoneOffset
  } = metaData

  if (!platform || !userAgent || !browser) {
    throw new AppError('Resource not found', 400);
  }

  if (!email || !password) {
    throw new AppError('Resource not found', 400);
  }

  //validating email
  if (!validateEmail(email)) {
    throw new AppError('Invalid Email!', 400);
  }

  //finding user
  const User = await prisma.user.findUnique({
    where: { email: email }, // Use your unique field here, such as email
  });

  if (!User) {
    throw new AppError('User not found', 500);
  }

  // Check accountStatus & Check lockoutUntil
  console.log(User)

  if (User.accountStatus == "inactive" || User.accountStatus == "suspended") {
    // TODO: Reset password 
  }
  if (User.accountStatus == "pending") {
    // TODO: Resend Email to verify email (resend)
  }

  //TODO: check lockoutUntil time 

  //


  //Compare password
  if (!comparePasswords(password, User.password)) {
    //TODO: password incorrect
  }

  // Create unique sessionId refreshToken, accessToken from email and sessionId
  const sessionId = generateUniqueId()
  const payload = {
    sessionId: sessionId,
    email: email
  }
  const refreshToken = generateToken(payload, process.env.TOKEN_SECRET, 10080) // 7 day
  const accessToken = generateToken(payload, process.env.TOKEN_SECRET, 1440) // 1 day
 


  const updatedUser = await prisma.user.update({
    where: { email: email },
    data: {
      lockoutUntil: null,
      failedLoginAttempts: 0,
      sessions: {
        create: [
          {
            sessionId: sessionId,
            refreshToken: refreshToken,
            accessToken: accessToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            metadata:{
              create:{
                platform: platform,
                userAgent: userAgent,
                browser: browser,
                language: language,
                ip: ip,
                deviceFingerprint: deviceFingerprint,
                timezoneOffset: parseInt( timezoneOffset)
              }
            }
          }
        ]
      }
    },
  });

  console.log(updatedUser)
  // const userMetadata = prisma.session.create(
  //   {
  //     data: {
  //       sessionId: generateSessionId(platform, userAgent, browser),
  //       platform: platform,
  //       userAgent: userAgent,
  //       browser: browser,
  //       language: language,
  //       ip: ip,
  //       deviceFingerprint: deviceFingerprint,
  //       timezoneOffset: timezoneOffset
  //     },
  //   }
  // )



  res.json({
    status: "success",
    message: "Login successful",
    
  });

});

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, projectId } = req.body;

    if (!email) {
      throw new ValidationError(errorMessages.EMAIL_REQUIRED);
    }

    await authService.forgotPassword(email, projectId);
    logger.info(`Password reset requested for: ${email}`);

    res.json({
      status: "success",
      message: "Password reset email sent",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, projectId } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError(errorMessages.MISSING_FIELDS);
    }

    await authService.resetPassword(token, newPassword, projectId);
    logger.info("Password reset successful");

    res.json({
      status: "success",
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const { sessionId, projectId } = req.user;
    const user = await authService.getUserProfile(userId, projectId);

    res.json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { userId, projectId } = req.user;
    const updates = req.body;

    const updatedUser = await authService.updateUserProfile(
      userId,
      projectId,
      updates
    );

    res.json({
      status: "success",
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { userId, projectId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(errorMessages.MISSING_FIELDS);
    }

    await authService.changePassword(
      userId,
      projectId,
      currentPassword,
      newPassword
    );
    logger.info(`Password changed for user: ${userId}`);

    res.json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

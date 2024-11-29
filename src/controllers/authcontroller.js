import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../middlewares/prismaMiddleware.js"
import { validateEmail } from "../utils/utils.js";
import { decodeToken, generateToken, generateUniqueId } from "../utils/jwtUtils.js"
import { sendEmail } from "../services/emailService.js";
import { VERIFY_EMAIL_MESSAGE } from "../messages/emailMessage.js";
import { comparePasswords } from "../utils/utils.js";
import { validatePassword } from "../utils/utils.js";
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
  if (!validatePassword(password)) {
    throw new AppError('Invalid Password!', 400);
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

//login ---->
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
  

  if (User.accountStatus == "inactive" || User.accountStatus == "suspended") {
    // TODO: Reset password email
    return res.status(401).json({
      status: "failed",
      message:"Reset password!"
    });
  }

  if (User.accountStatus == "pending") {
   // Resend Email to verify email (resend)
    const payload = {
      email: email
    }
    const token = generateToken(payload, process.env.VERIFY_EMAIL_SECRET)
  
     await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        verificationToken: token
      },
    })
  
    await sendEmail(email, VERIFY_EMAIL_MESSAGE(token))

    return res.status(401).json({
      status: "failed",
      message:"Verify your email!"
    });
  
  }

  //check lockoutUntil time 

if(User.lockoutUntil.getTime()>Date.now()){
  return res.status(403).json({
    status: "failed",
    message:"Try again in 15 Minutes"
  });
}



  //Compare password
  const iscorrect=await comparePasswords(password, User.password)

  if (!iscorrect) {

    if (User.failedLoginAttempts < 10) { 
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts+1
        },
      })

    } else if (User.failedLoginAttempts > 20) {
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts+1,
          accountStatus:"suspended",
          lockoutUntil:new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      })

    } else { // for greater then 10 and less than 200
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts+1,
          lockoutUntil:new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      })
    }

    return res.status(400).json({
      status: "failed",
      message:"Incorrect password!"
    });
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
            metadata: {
              create: {
                platform: platform,
                userAgent: userAgent,
                browser: browser,
                language: language,
                ip: ip,
                deviceFingerprint: deviceFingerprint,
                timezoneOffset: parseInt(timezoneOffset)
              }
            }
          }
        ]
      }
    },
  });

  if(!updatedUser){
    throw new AppError('Failed to update user', 500);
  }

  // console.log(updatedUser)

  //sending token in authorization token
  res.setHeader('Authorization', `Bearer ${refreshToken},Bearer ${accessToken}`);

  res.status(200).json({
    sessionId: sessionId,
    status: "success",
  });

});

// <-------- end of login 


//Reset password ---->
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

export const resetPasswordUi=asyncHandler(async(req,res)=>{
  const token = '12mfdmfflnekrjtnergmdf'

  res.render('resetpassword', { token, env: process.env.PUBLIC_URL });
})

export const resetPassword =asyncHandler( async (req, res, next) => {
  // throw new AppError('Password incorr', 500);

  const {password,allLogout}=req.body
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log(token)
  console.log(req.body)
  console.log(password,allLogout)
  res.status(200).json({
    sttatus:"success"
  })
});
// <-------- end of reset password 











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

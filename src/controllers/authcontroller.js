import asyncHandler from "express-async-handler";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../middlewares/prismaMiddleware.js"
import { validateEmail } from "../utils/utils.js";
import { decodeToken, generateToken, generateUniqueId } from "../utils/jwtUtils.js"
import { sendEmail } from "../services/emailService.js";
import { VERIFY_EMAIL_MESSAGE, FORGET_PASSWORD_MESSAGE, PASSWORD_CHANGE_SUCCESSFUL_MESSAGE } from "../messages/emailMessage.js";
import { comparePasswords } from "../utils/utils.js";
import { validatePassword } from "../utils/utils.js";
import { hashData } from "../utils/utils.js";


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
  const { email, type } = decodeToken(token, process.env.VERIFY_EMAIL_SECRET)

  if (!email || type != 'verifyEmail') {
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

  // send the success html and to close the window as well
  res.render('success', { message: "success!!" });
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
    type: "verifyEmail",
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

  const link = `${process.env.PUBLIC_URL}/api/auth/register/${token}`
  await sendEmail(email, VERIFY_EMAIL_MESSAGE(link))


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
    const data = {
      email: email
    }
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    // const res = await fetch(`${process.env.PUBLIC_URL}/api/auth/forgetpassword`,
    //   {
    //     method: "POST",
    //     body: JSON.stringify(data),
    //     headers: myHeaders,
    //   }
    // )
    const response = await fetch(`http://localhost:3000/api/auth/forgetpassword`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: myHeaders,
      }
    )
    if(!response.ok){
      throw new AppError('Server Error', 500);
    }
    return res.status(403).json({
      status: "failed",
      message: "Reset password!"
    });
  }

  if (User.accountStatus == "pending") {
    // Resend Email to verify email (resend)
    const payload = {
      type: "verifyEmail",
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
    const link = `${process.env.PUBLIC_URL}/api/auth/register/${token}`
    await sendEmail(email, VERIFY_EMAIL_MESSAGE(link))

    return res.status(401).json({
      status: "failed",
      message: "Verify your email!"
    });

  }

  //check lockoutUntil time 

  if (User.lockoutUntil) {
    if (User.lockoutUntil.getTime() > Date.now()) {
      return res.status(403).json({
        status: "failed",
        message: "Try again in 15 Minutes"
      });
    }
  }



  //Compare password
  const iscorrect = await comparePasswords(password, User.password)

  if (!iscorrect) {

    if (User.failedLoginAttempts < 10) {
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts + 1
        },
      })

    } else if (User.failedLoginAttempts > 20) {
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts + 1,
          accountStatus: "suspended",
          lockoutUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      })

    } else { // for greater then 10 and less than 200
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          failedLoginAttempts: User.failedLoginAttempts + 1,
          lockoutUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      })
    }

    return res.status(400).json({
      status: "failed",
      message: "Incorrect password!"
    });
  }

  // Create unique sessionId refreshToken, accessToken from email and sessionId
  const sessionId = generateUniqueId()
  const payload = {
    sessionId: sessionId,
    email: email
  }
  const refreshToken = generateToken({ type: "refresh", ...payload }, process.env.TOKEN_SECRET, 10080) // 7 day
  const accessToken = generateToken({ type: 'access', ...payload }, process.env.TOKEN_SECRET, 1440) // 1 day



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

  if (!updatedUser) {
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
export const forgotPassword = asyncHandler(async (req, res, next) => {

  const { email } = req.body;

  if (!email) {
    throw new AppError('Resource not found', 400);
  }

  if (!validateEmail(email)) {
    throw new AppError('Invalid Email!', 400);
  }

  const payload = {
    type: "resetPassword",
    email: email
  }
  const token = generateToken(payload, process.env.FORGETPASSWORD_SECRET, 10)
  const updatedUser = await prisma.user.update({
    where: { email: email },
    data: {
      resetPasswordToken: token,
      resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000)
    },
  });


  if (!updatedUser) {
    throw new AppError('User not found!', 404);
  }

  const link = `${process.env.PUBLIC_URL}/api/auth/resetpassword/${token}`

  await sendEmail(email, FORGET_PASSWORD_MESSAGE(link, updatedUser.name))

  res.json({
    status: "success",
    message: "Password reset email sent",
  });

});

export const resetPasswordUi = asyncHandler(async (req, res, next) => {
  const { token } = req.params
  if (!token) {
    return next()
  }
  const { email, type } = decodeToken(token, process.env.FORGETPASSWORD_SECRET)
  if (type != "resetPassword" || !validateEmail(email)) {
    return next()
  }

  const payload = {
    type: "resetPassword",
    email: email
  }
  const forget_token = generateToken(payload, process.env.FORGETPASSWORD_SECRET, 10)

  const updatedUser = await prisma.user.update({
    where: { email: email, resetPasswordToken: token },
    data: {
      resetPasswordToken: forget_token,
      resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000)
    },
  });

  if (!updatedUser) {
    return next()
  }

  res.render('resetpassword', { token: forget_token, env: process.env.PUBLIC_URL });
})

export const resetPassword = asyncHandler(async (req, res, next) => {
  // throw new AppError('Password incorr', 500);

  const { password, allLogout } = req.body
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !password) {
    throw new AppError('Resource not found', 400);
  }

  const { email, type } = decodeToken(token, process.env.FORGETPASSWORD_SECRET)

  if (type != "resetPassword" || !validateEmail(email)) {
    throw new AppError('Invalid token or email', 500);
  }

  //Checking if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email, resetPasswordToken: token }, // Use your unique field here, such as email
  });

  if (!existingUser) {
    throw new AppError('User not found', 500);
  }

  
  const updatedUser = await prisma.user.update({
    where: { email: email, resetPasswordToken: token },
    data: {
      accountStatus:"active",
      resetPasswordToken: null,
      lastPasswordChange: new Date(),
      updatedAt: new Date(),
      resetPasswordExpires: null,
      password: await hashData(password)
    },
  });

  if (!updatedUser) {
    return next()
  }
  if (allLogout) {
    await prisma.session.deleteMany({
      where: {
        userId: updatedUser.id, // Use the updated user's ID
      },
    });
  }

  const payload = {
    type: "suspended",
    email: email
  }
  const suspendToken = generateToken(payload, process.env.SUSPEND_ACCOUNT_SECRET, 5)

  const link = `${process.env.PUBLIC_URL}/api/auth/suspend/user/${suspendToken}`

  await sendEmail(email, PASSWORD_CHANGE_SUCCESSFUL_MESSAGE(link, updatedUser.name))

  res.status(200).json({
    status: "success"
  })
});

export const suspendAccount = asyncHandler(async (req, res) => {
  const { token } = req.params
  if (!token) {
    throw new AppError('Resource not found', 400);
  }
  const { type, email } = decodeToken(token, process.env.SUSPEND_ACCOUNT_SECRET)

  if (!email || type != "suspended") {
    throw new AppError('Resource not found', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { email: email },
    data: {
      accountStatus: "suspended"
    },
  });

  if (!updatedUser) {
    throw new AppError('Error Updating user', 500);
  }
  await prisma.session.deleteMany({
    where: {
      userId: updatedUser.id, // Use the updated user's ID
    },
  });

  res.render('success', { message: "Account Suspended please change your password!" });
})
// <-------- end of reset password 


//logout ---->
export const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Invalid request', 404);
  }

  const { email, sessionId, type } = decodeToken(token, process.env.TOKEN_SECRET)

  if (!email || !sessionId || !validateEmail(email) || type != "refresh") {
    throw new AppError('Invalid request', 404);
  }

  // Delete the session
  await prisma.session.delete({
    where: {
      sessionId: sessionId,
    },
  });

  res.status(200).json({
    status: "success"
  })
})
// <-------- logout


import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwtUtils.js";
import { hashData } from "../utils/utils.js";
import { sendEmail } from "../services/emailService.js";
import { VERIFY_EMAIL_MESSAGE } from "../messages/emailMessage.js";

export const prisma = new PrismaClient().$extends({
  query: {
    user: {
      async create({ args, query }) {
        //hashing password
        if (args.data.password) {
            args.data.password =await hashData(args.data.password)  
        }
        
        //saving the verification token
        const payload={ 
            type :"verifyEmail",
            email:args.data.email
        }
        const token=generateToken(payload, process.env.VERIFY_EMAIL_SECRET)

        args.data.verificationToken=token

        // sending the email with the token
        const link=`${process.env.PUBLIC_URL}/api/auth/register/${token}`
        await sendEmail(args.data.email,VERIFY_EMAIL_MESSAGE(link))
 
        return query(args);
      },
      // async update({ args, query }) {
      //   // Check if password is being updated
        
      //   return query(args);
      // },
    },
  },
});


    
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwtUtils.js";
import { hashData } from "../utils/utils.js";


export const prisma = new PrismaClient().$extends({
  query: {
    user: {
      async create({ args, query }) {
        // Check if password is provided

        if (args.data.password) {
            args.data.password =await hashData(args.data.password)
          
        }
        
        const payload={
            email:args.data.email
        }
        const token=generateToken(payload, process.env.VERIFY_EMAIL_SECRET)

        args.data.verificationToken=token

        // TODO: send the email with the token
 
       

        return query(args);
      },
    //   async update({ args, query }) {
    //     // Check if password is being updated
    //     if (args.data.password) {
    //       const salt = await bcrypt.genSalt(10);
    //       args.data.password = await bcrypt.hash(args.data.password, salt);
    //     }
    //     // Proceed with the original query
    //     return query(args);
    //   },
    },
  },
});


    

import { PrismaClient } from "@prisma/client";

import bcrypt from 'bcryptjs';


export const prisma = new PrismaClient().$extends({
  query: {
    user: {
      async create({ args, query }) {
        // Check if password is provided
        if (args.data.password) {
          const salt = await bcrypt.genSalt(10);
          args.data.password = await bcrypt.hash(args.data.password, salt);
        }
        // Proceed with the original query
        return query(args);
      },
      async update({ args, query }) {
        // Check if password is being updated
        if (args.data.password) {
          const salt = await bcrypt.genSalt(10);
          args.data.password = await bcrypt.hash(args.data.password, salt);
        }
        // Proceed with the original query
        return query(args);
      },
    },
  },
});


    

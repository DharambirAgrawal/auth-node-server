# Auth Server

A reusable authentication server with multi-tenancy support.

## Features

- User registration and login
- Password reset functionality
- Role-based access control
- Multi-tenancy support
- Rate limiting
- JWT-based authentication

## Setup

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/auth-server.git
   ```

2. Install dependencies:

   ```
   cd auth-server
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables (see `.env.example` for required variables).

   ```
   NODE_ENV="development" | "production" #either production or development

   DATABASE_URL="" # Neon DB url

   VERIFY_EMAIL_SECRET="" #secret for email verification email token

   EMAIL_USER="" # the email to use to send emails

   EMAIL_PASSWORD="" # above email app password  

   TOKEN_SECRET="kdfnkdjfgkdf"
   FORGETPASSWORD_SECRET="kdfjsbdfisdufgisudfisdfsd"
   SUSPEND_ACCOUNT_SECRET="jfngbjdfbgjdfgbjdf"

   PUBLIC_URL="http://localhost:3000"
   ```

4. use prisma command as:

   ```
   npx prisma generate
   npx prisma db push
   ```

4. Start the server:

   ```
   npm start
   ```

5. For development, use:

   ```
   npm run dev
   ```

## Usage

[Add information about how to use your authentication server, including API endpoints and example requests]

## Contributing

[Add information about how others can contribute to your project]

## License

This project is licensed under the ISC License.

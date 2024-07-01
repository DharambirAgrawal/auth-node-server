import authService from "../services/authService.js";
import { AuthenticationError, ValidationError } from "../errors/index.js";
import { errorMessages } from "../errors/errorMessages.js";
import logger from "../utils/logger.js";

export const register = async (req, res, next) => {
  try {
    const { email, password, projectId } = req.body;

    if (!email || !password) {
      throw new ValidationError(errorMessages.MISSING_FIELDS);
    }

    const user = await authService.registerUser(email, password, projectId);
    logger.info(`User registered: ${user._id}`);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { userId: user._id },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, projectId } = req.body;

    if (!email || !password) {
      throw new ValidationError(errorMessages.MISSING_FIELDS);
    }

    const { token, user } = await authService.loginUser(
      email,
      password,
      projectId
    );
    logger.info(`User logged in: ${user._id}`);

    res.json({
      status: "success",
      message: "Login successful",
      data: { token, userId: user._id, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

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
    const { userId, projectId } = req.user;
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

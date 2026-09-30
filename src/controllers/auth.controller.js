import { AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signup = asyncHandler(async (req, res) => {
  const result = await AuthService.signup(req.body);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

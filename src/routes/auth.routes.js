import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { signupSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/signup', authRateLimiter, validate(signupSchema), signup);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;

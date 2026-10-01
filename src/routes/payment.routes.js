import { Router } from 'express';
import { processPayment, handleWebhook } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { paymentRateLimiter } from '../middleware/rateLimit.middleware.js';
import { processPaymentSchema, webhookSchema } from '../validators/payment.validator.js';

const router = Router();

// Protected payment simulation endpoint
router.post('/', authenticate, paymentRateLimiter, validate(processPaymentSchema), processPayment);

// Public payment webhook endpoint
router.post('/webhook', validate(webhookSchema), handleWebhook);

export default router;

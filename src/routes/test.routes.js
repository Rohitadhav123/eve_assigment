import { Router } from 'express';
import { getTests, createTest } from '../controllers/centre.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTestSchema, paginationQuerySchema } from '../validators/centre.validator.js';

const router = Router();

router.get('/', validate(paginationQuerySchema, 'query'), getTests);
router.post('/', authenticate, requireRole('ADMIN'), validate(createTestSchema), createTest);

export default router;

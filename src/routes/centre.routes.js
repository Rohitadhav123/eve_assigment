import { Router } from 'express';
import {
  getCentres,
  getCentreById,
  createCentre,
  addTestToCentre,
  getTests,
  createTest,
} from '../controllers/centre.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCentreSchema,
  addTestToCentreSchema,
  createTestSchema,
  paginationQuerySchema,
} from '../validators/centre.validator.js';

const router = Router();

// Diagnostic Centres
router.get('/', validate(paginationQuerySchema, 'query'), getCentres);
router.get('/:id', getCentreById);
router.post('/', authenticate, requireRole('ADMIN'), validate(createCentreSchema), createCentre);
router.post('/:id/tests', authenticate, requireRole('ADMIN'), validate(addTestToCentreSchema), addTestToCentre);

// Diagnostic Tests
router.get('/tests/all', validate(paginationQuerySchema, 'query'), getTests);

export default router;

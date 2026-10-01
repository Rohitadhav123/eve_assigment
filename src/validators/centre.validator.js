import { z } from 'zod';

export const createCentreSchema = z.object({
  name: z.string().min(2, 'Centre name must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
});

export const addTestToCentreSchema = z.object({
  testId: z.string().uuid('Invalid test ID format'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be greater than 0'),
});

export const createTestSchema = z.object({
  name: z.string().min(2, 'Test name must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
});

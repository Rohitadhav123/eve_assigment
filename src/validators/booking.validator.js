import { z } from 'zod';

export const createBookingSchema = z.object({
  centreId: z.string().uuid('Invalid centre ID format'),
  testId: z.string().uuid('Invalid test ID format'),
  appointmentAt: z.string().datetime({ message: 'Invalid appointment date format. Must be an ISO date string.' }).refine(
    (dateStr) => new Date(dateStr) > new Date(),
    { message: 'Appointment date must be in the future' }
  ),
});

export const getBookingsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']).optional(),
});

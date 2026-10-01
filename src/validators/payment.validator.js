import { z } from 'zod';

export const processPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
});

export const webhookSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  type: z.enum(['payment.success', 'payment.failed'], {
    errorMap: () => ({ message: "Supported event types are 'payment.success' and 'payment.failed'" }),
  }),
  bookingId: z.string().uuid('Invalid booking ID format'),
  providerTransactionId: z.string().optional(),
  amount: z.number().optional(),
});

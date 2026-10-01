import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/error.js';
import { verifyWebhookSignature } from '../utils/security.js';
import { BookingStateService } from './bookingState.service.js';

export class PaymentService {
  /**
   * Process simulated payment for a booking.
   */
  static async processPayment({ bookingId, user, idempotencyKey, forcedOutcomeHeader }) {
    // 1. Check idempotency if key provided
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { booking: true },
      });

      if (existingPayment) {
        return {
          payment: existingPayment,
          bookingStatus: existingPayment.booking.status,
          idempotencyReplayed: true,
        };
      }
    }

    // 2. Fetch booking & validate ownership and state
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      throw new AppError('Forbidden: You do not own this booking', 403, 'FORBIDDEN');
    }

    if (booking.status !== 'PENDING') {
      throw new AppError(
        `Cannot pay for booking with status '${booking.status}'. Only PENDING bookings can be paid.`,
        400,
        'INVALID_BOOKING_STATUS'
      );
    }

    // 3. Determine payment outcome
    let isSuccess = false;
    if (env.NODE_ENV === 'test' && forcedOutcomeHeader) {
      isSuccess = forcedOutcomeHeader.toLowerCase() === 'success';
    } else {
      isSuccess = Math.random() < env.PAYMENT_SUCCESS_RATE;
    }

    const paymentStatus = isSuccess ? 'SUCCESS' : 'FAILED';
    const targetBookingStatus = isSuccess ? 'CONFIRMED' : 'FAILED';
    const providerTransactionId = `txn_${crypto.randomUUID()}`;

    // 4. Perform transactional payment & booking status update
    try {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.amount,
            status: paymentStatus,
            providerTransactionId,
            idempotencyKey: idempotencyKey || null,
          },
        });

        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: { status: targetBookingStatus },
        });

        return { payment, booking: updatedBooking };
      });

      return {
        payment: result.payment,
        bookingStatus: result.booking.status,
        idempotencyReplayed: false,
      };
    } catch (error) {
      if (error.code === 'P2002' && idempotencyKey) {
        // Concurrent request with same idempotencyKey
        const payment = await prisma.payment.findUnique({
          where: { idempotencyKey },
          include: { booking: true },
        });
        return {
          payment,
          bookingStatus: payment.booking.status,
          idempotencyReplayed: true,
        };
      }
      throw error;
    }
  }

  /**
   * Process payment webhook idempotently with signature verification.
   */
  static async processWebhook({ signatureHeader, rawBody, payload }) {
    // 1. Signature verification
    const isValidSignature = verifyWebhookSignature(rawBody, signatureHeader, env.WEBHOOK_SECRET);
    if (!isValidSignature) {
      throw new AppError('Invalid webhook signature', 401, 'UNAUTHORIZED');
    }

    const { eventId, type, bookingId, providerTransactionId, amount } = payload;

    // 2. Quick pre-check for idempotency
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      return { status: 'already_processed' };
    }

    // 3. Process inside a single database transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Record WebhookEvent (DB unique constraint on eventId guarantees idempotency under concurrency)
        const webhookRecord = await tx.webhookEvent.create({
          data: {
            eventId,
            type,
            payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
            processedAt: new Date(),
          },
        });

        // Find associated booking
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking) {
          // Record logged, but no booking to process
          return { status: 'processed', note: 'Booking not found' };
        }

        // Determine target status for booking
        const targetBookingStatus = type === 'payment.success' ? 'CONFIRMED' : 'FAILED';
        const targetPaymentStatus = type === 'payment.success' ? 'SUCCESS' : 'FAILED';

        // Check allowed state transition
        const transitionCheck = BookingStateService.validateTransition(booking.status, targetBookingStatus);

        let finalBookingStatus = booking.status;

        if (transitionCheck.valid) {
          finalBookingStatus = transitionCheck.targetStatus;
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: finalBookingStatus },
          });
        } else {
          console.warn(
            `[Webhook Log] Invalid booking transition skipped. Event ${eventId} (${type}) attempted transition on Booking ${bookingId} with status '${booking.status}'. Reason: ${transitionCheck.reason}`
          );
        }

        // Record or update payment details
        const txnId = providerTransactionId || `txn_webhook_${crypto.randomUUID()}`;

        let payment = await tx.payment.findFirst({
          where: { bookingId },
        });

        if (payment) {
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: targetPaymentStatus,
              providerTransactionId: txnId,
            },
          });
        } else {
          payment = await tx.payment.create({
            data: {
              bookingId,
              amount: amount || booking.amount,
              status: targetPaymentStatus,
              providerTransactionId: txnId,
            },
          });
        }

        return {
          status: 'processed',
          eventId: webhookRecord.eventId,
          bookingStatus: finalBookingStatus,
        };
      });

      return result;
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
        return { status: 'already_processed' };
      }
      throw error;
    }
  }
}

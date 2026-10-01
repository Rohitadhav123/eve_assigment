import { PaymentService } from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const processPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
  const forcedOutcomeHeader = req.headers['x-test-payment-outcome'];

  const result = await PaymentService.processPayment({
    bookingId,
    user: req.user,
    idempotencyKey,
    forcedOutcomeHeader,
  });

  const statusCode = result.idempotencyReplayed ? 200 : 201;

  res.status(statusCode).json({
    success: true,
    message: result.idempotencyReplayed ? 'Payment idempotency replayed' : 'Payment processed successfully',
    data: {
      payment: result.payment,
      bookingStatus: result.bookingStatus,
      idempotencyReplayed: result.idempotencyReplayed,
    },
  });
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const signatureHeader = req.headers['x-signature'] || req.headers['X-Signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await PaymentService.processWebhook({
    signatureHeader,
    rawBody,
    payload: req.body,
  });

  res.status(200).json(result);
});

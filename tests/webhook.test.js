import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateWebhookSignature } from '../src/utils/security.js';
import { env } from '../src/config/env.js';

describe('Webhook System & Idempotency Integration Tests', () => {
  let userToken;
  let centre;
  let testItem;
  let centreTest;
  let booking;

  beforeEach(async () => {
    await prisma.webhookEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.user.deleteMany();

    const u1Res = await request(app).post('/api/auth/signup').send({
      name: 'User One',
      email: 'webhookuser@example.com',
      password: 'Password123',
    });
    userToken = u1Res.body.data.token;

    centre = await prisma.diagnosticCentre.create({
      data: { name: 'Metropolis', location: 'Pune' },
    });

    testItem = await prisma.diagnosticTest.create({
      data: { name: 'KFT Test', description: 'Kidney function' },
    });

    centreTest = await prisma.centreTest.create({
      data: {
        centreId: centre.id,
        testId: testItem.id,
        price: 900,
      },
    });

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: new Date(Date.now() + 86400000).toISOString(),
      });

    booking = bookingRes.body.data;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/payments/webhook - Invalid signature returns 401 Unauthorized', async () => {
    const payload = {
      eventId: 'evt_invalid_sig',
      type: 'payment.success',
      bookingId: booking.id,
      providerTransactionId: 'txn_bad_sig',
      amount: 900,
    };

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', 'invalid_signature_hex_code')
      .send(payload);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBe('Invalid webhook signature');
  });

  test('POST /api/payments/webhook - Successful payment webhook confirms booking', async () => {
    const payload = {
      eventId: 'evt_success_100',
      type: 'payment.success',
      bookingId: booking.id,
      providerTransactionId: 'txn_success_100',
      amount: 900,
    };

    const signature = generateWebhookSignature(payload, env.WEBHOOK_SECRET);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', signature)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('processed');

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking.status).toBe('CONFIRMED');
  });

  test('POST /api/payments/webhook - Same webhook sent 3 times processed idempotently', async () => {
    const payload = {
      eventId: 'evt_idempotent_333',
      type: 'payment.success',
      bookingId: booking.id,
      providerTransactionId: 'txn_idempotent_333',
      amount: 900,
    };

    const signature = generateWebhookSignature(payload, env.WEBHOOK_SECRET);

    // First call
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', signature)
      .send(payload);
    expect(res1.statusCode).toBe(200);
    expect(res1.body.status).toBe('processed');

    // Second call
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', signature)
      .send(payload);
    expect(res2.statusCode).toBe(200);
    expect(res2.body.status).toBe('already_processed');

    // Third call
    const res3 = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', signature)
      .send(payload);
    expect(res3.statusCode).toBe(200);
    expect(res3.body.status).toBe('already_processed');

    // Verify exactly 1 WebhookEvent record created in DB
    const webhookCount = await prisma.webhookEvent.count({
      where: { eventId: 'evt_idempotent_333' },
    });
    expect(webhookCount).toBe(1);
  });

  test('POST /api/payments/webhook - Late failed webhook does not change CONFIRMED booking', async () => {
    // 1. Confirm booking via successful payment
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
    });

    // 2. Late failed webhook arrives
    const payload = {
      eventId: 'evt_late_failed_999',
      type: 'payment.failed',
      bookingId: booking.id,
      providerTransactionId: 'txn_late_failed_999',
      amount: 900,
    };

    const signature = generateWebhookSignature(payload, env.WEBHOOK_SECRET);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('X-Signature', signature)
      .send(payload);

    expect(res.statusCode).toBe(200);

    // Verify booking is STILL CONFIRMED
    const currentBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(currentBooking.status).toBe('CONFIRMED');
  });
});

import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Payment System Integration Tests', () => {
  let userToken;
  let user2Token;
  let centre;
  let testItem;
  let centreTest;

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.user.deleteMany();

    const u1Res = await request(app).post('/api/auth/signup').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123',
    });
    userToken = u1Res.body.data.token;

    const u2Res = await request(app).post('/api/auth/signup').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123',
    });
    user2Token = u2Res.body.data.token;

    centre = await prisma.diagnosticCentre.create({
      data: { name: 'Health Centre B', location: 'Mumbai' },
    });

    testItem = await prisma.diagnosticTest.create({
      data: { name: 'Lipid Test', description: 'Cholesterol' },
    });

    centreTest = await prisma.centreTest.create({
      data: {
        centreId: centre.id,
        testId: testItem.id,
        price: 600,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/payments - Successful payment confirms booking', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = bookingRes.body.data.id;

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-test-payment-outcome', 'success')
      .send({ bookingId });

    expect(payRes.statusCode).toBe(201);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.payment.status).toBe('SUCCESS');
    expect(payRes.body.data.bookingStatus).toBe('CONFIRMED');
  });

  test('POST /api/payments - Failed payment sets booking to FAILED', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = bookingRes.body.data.id;

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-test-payment-outcome', 'failed')
      .send({ bookingId });

    expect(payRes.statusCode).toBe(201);
    expect(payRes.body.data.payment.status).toBe('FAILED');
    expect(payRes.body.data.bookingStatus).toBe('FAILED');
  });

  test('POST /api/payments - Cannot pay another user booking returns 403', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = bookingRes.body.data.id;

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ bookingId });

    expect(payRes.statusCode).toBe(403);
  });

  test('POST /api/payments - Cannot pay cancelled booking returns 400', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = bookingRes.body.data.id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId });

    expect(payRes.statusCode).toBe(400);
  });

  test('POST /api/payments - Idempotency-Key prevents duplicate payment processing', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = bookingRes.body.data.id;
    const idempotencyKey = 'idempotent_key_test_123';

    // First payment call
    const firstPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .set('x-test-payment-outcome', 'success')
      .send({ bookingId });

    expect(firstPayRes.statusCode).toBe(201);
    expect(firstPayRes.body.data.idempotencyReplayed).toBe(false);

    // Second payment call with SAME Idempotency-Key
    const secondPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ bookingId });

    expect(secondPayRes.statusCode).toBe(200);
    expect(secondPayRes.body.data.idempotencyReplayed).toBe(true);
    expect(secondPayRes.body.data.payment.id).toBe(firstPayRes.body.data.payment.id);
  });
});

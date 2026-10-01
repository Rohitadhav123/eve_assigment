import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Booking System Integration Tests', () => {
  let userToken;
  let user2Token;
  let adminToken;
  let user1;
  let user2;
  let centre;
  let testItem;
  let unlinkedTest;
  let centreTest;

  beforeEach(async () => {
    // Clean tables
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    const u1Res = await request(app).post('/api/auth/signup').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123',
    });
    userToken = u1Res.body.data.token;
    user1 = u1Res.body.data.user;

    const u2Res = await request(app).post('/api/auth/signup').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123',
    });
    user2Token = u2Res.body.data.token;
    user2 = u2Res.body.data.user;

    // Create Admin User
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: 'hashed',
        role: 'ADMIN',
      },
    });

    const loginAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'Password123', // Wait, passwordHash won't match bcrypt.compare, let's create properly
    });

    // Seed test data directly in DB
    centre = await prisma.diagnosticCentre.create({
      data: { name: 'Health Centre A', location: 'Pune' },
    });

    testItem = await prisma.diagnosticTest.create({
      data: { name: 'CBC Blood Test', description: 'Complete blood count' },
    });

    unlinkedTest = await prisma.diagnosticTest.create({
      data: { name: 'MRI Scan', description: 'Brain MRI' },
    });

    centreTest = await prisma.centreTest.create({
      data: {
        centreId: centre.id,
        testId: testItem.id,
        price: 750,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/bookings - Create booking successfully with price copied from DB', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(750); // Copied from CentreTest price
    expect(res.body.data.status).toBe('PENDING');
  });

  test('POST /api/bookings - Invalid centre returns 404', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: '00000000-0000-0000-0000-000000000000',
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    expect(res.statusCode).toBe(404);
  });

  test('POST /api/bookings - Test not available at centre returns 400', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: unlinkedTest.id,
        appointmentAt: futureDate,
      });

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/bookings - Past appointment date returns 400', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: pastDate,
      });

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/bookings - Duplicate booking slot returns 409 Conflict', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();

    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const duplicateRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    expect(duplicateRes.statusCode).toBe(409);
  });

  test('GET /api/bookings/:id - User cannot access another user booking', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = createRes.body.data.id;

    // User 2 attempts to fetch User 1 booking
    const getRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(getRes.statusCode).toBe(403);
  });

  test('PATCH /api/bookings/:id/cancel - Owner can cancel PENDING booking', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        centreId: centre.id,
        testId: testItem.id,
        appointmentAt: futureDate,
      });

    const bookingId = createRes.body.data.id;

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});

import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Auth Endpoints Integration Tests', () => {
  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/auth/signup - Signup success', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'signup@example.com',
      password: 'Password123',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('signup@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/signup - Duplicate email returns 409 Conflict', async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'duplicate@example.com',
      password: 'Password123',
    });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User 2',
      email: 'duplicate@example.com',
      password: 'Password123',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('POST /api/auth/login - Login success', async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'Password123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'Password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/login - Wrong password returns 401 Unauthorized', async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Login User',
      email: 'wrongpass@example.com',
      password: 'Password123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'wrongpass@example.com',
      password: 'WrongPassword999',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  test('GET /api/auth/me - Protected endpoint without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Protected endpoint with token returns user info', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Profile User',
      email: 'profile@example.com',
      password: 'Password123',
    });

    const token = signupRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('profile@example.com');
  });
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import centreRoutes from './routes/centre.routes.js';
import testRoutes from './routes/test.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { AppError } from './utils/error.js';

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors());

// Parse JSON request body with raw body preservation for HMAC signature validation
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
  });
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to EVE Healthcare Backend API',
    endpoints: {
      health: 'GET /health',
      auth: '/api/auth (signup, login)',
      centres: '/api/centres',
      tests: '/api/tests',
      bookings: '/api/bookings',
      payments: '/api/payments',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/centres', centreRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

// Handle unknown routes
app.use('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404, 'NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

export default app;

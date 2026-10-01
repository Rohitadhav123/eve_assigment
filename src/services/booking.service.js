import prisma from '../config/prisma.js';
import { AppError } from '../utils/error.js';
import { BookingStateService } from './bookingState.service.js';

export class BookingService {
  static async createBooking({ userId, centreId, testId, appointmentAt }) {
    const appointmentDate = new Date(appointmentAt);
    if (appointmentDate <= new Date()) {
      throw new AppError('Appointment date must be in the future', 400, 'VALIDATION_ERROR');
    }

    // 1. Verify centre exists
    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id: centreId },
    });
    if (!centre) {
      throw new AppError('Diagnostic centre not found', 404, 'NOT_FOUND');
    }

    // 2. Verify test exists
    const test = await prisma.diagnosticTest.findUnique({
      where: { id: testId },
    });
    if (!test) {
      throw new AppError('Diagnostic test not found', 404, 'NOT_FOUND');
    }

    // 3. Verify test is offered at centre & fetch price
    const centreTest = await prisma.centreTest.findUnique({
      where: {
        centreId_testId: { centreId, testId },
      },
    });

    if (!centreTest) {
      throw new AppError('Diagnostic test is not available at the selected centre', 400, 'BAD_REQUEST');
    }

    // 4. Prevent duplicate booking slot for the same centreTest & appointmentAt
    const existingSlotBooking = await prisma.booking.findFirst({
      where: {
        centreTestId: centreTest.id,
        appointmentAt: appointmentDate,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingSlotBooking) {
      throw new AppError('This appointment slot is already booked for the selected test and centre', 409, 'SLOT_UNAVAILABLE');
    }

    // 5. Create booking with price from database
    try {
      const booking = await prisma.booking.create({
        data: {
          userId,
          centreTestId: centreTest.id,
          appointmentAt: appointmentDate,
          amount: centreTest.price,
          status: 'PENDING',
        },
        include: {
          centreTest: {
            include: {
              centre: true,
              test: true,
            },
          },
        },
      });

      return booking;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AppError('This appointment slot is already booked for the selected test and centre', 409, 'SLOT_UNAVAILABLE');
      }
      throw error;
    }
  }

  static async getBookings({ user, page = 1, limit = 10, status }) {
    const skip = (page - 1) * limit;
    const where = {};

    // Admin can view all; regular users only see their own
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }

    if (status) {
      where.status = status;
    }

    const [total, items] = await prisma.$transaction([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          centreTest: {
            include: {
              centre: true,
              test: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: items,
    };
  }

  static async getBookingById({ bookingId, user }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        centreTest: {
          include: {
            centre: true,
            test: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    // Authorization check
    if (user.role !== 'ADMIN' && booking.userId !== user.id) {
      throw new AppError('Forbidden: You do not have access to this booking', 403, 'FORBIDDEN');
    }

    return booking;
  }

  static async cancelBooking({ bookingId, user }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (user.role !== 'ADMIN' && booking.userId !== user.id) {
      throw new AppError('Forbidden: You do not have access to cancel this booking', 403, 'FORBIDDEN');
    }

    const transitionCheck = BookingStateService.validateTransition(booking.status, 'CANCELLED');
    if (!transitionCheck.valid) {
      throw new AppError(
        `Cannot cancel booking with status ${booking.status}. Only PENDING or CONFIRMED bookings can be cancelled.`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: {
        centreTest: {
          include: { centre: true, test: true },
        },
      },
    });

    return updatedBooking;
  }
}

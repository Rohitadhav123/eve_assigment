import { BookingService } from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createBooking = asyncHandler(async (req, res) => {
  const { centreId, testId, appointmentAt } = req.body;
  const booking = await BookingService.createBooking({
    userId: req.user.id,
    centreId,
    testId,
    appointmentAt,
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

export const getBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const { status } = req.query;

  const result = await BookingService.getBookings({
    user: req.user,
    page,
    limit,
    status,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await BookingService.getBookingById({
    bookingId: id,
    user: req.user,
  });

  res.status(200).json({
    success: true,
    data: booking,
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedBooking = await BookingService.cancelBooking({
    bookingId: id,
    user: req.user,
  });

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: updatedBooking,
  });
});

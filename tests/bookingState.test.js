import { BookingStateService } from '../src/services/bookingState.service.js';

describe('BookingStateService Unit Tests', () => {
  test('should allow valid transition from PENDING to CONFIRMED', () => {
    const res = BookingStateService.validateTransition('PENDING', 'CONFIRMED');
    expect(res.valid).toBe(true);
    expect(res.targetStatus).toBe('CONFIRMED');
  });

  test('should allow valid transition from PENDING to FAILED', () => {
    const res = BookingStateService.validateTransition('PENDING', 'FAILED');
    expect(res.valid).toBe(true);
    expect(res.targetStatus).toBe('FAILED');
  });

  test('should allow valid transition from PENDING to CANCELLED', () => {
    const res = BookingStateService.validateTransition('PENDING', 'CANCELLED');
    expect(res.valid).toBe(true);
    expect(res.targetStatus).toBe('CANCELLED');
  });

  test('should allow valid transition from CONFIRMED to CANCELLED', () => {
    const res = BookingStateService.validateTransition('CONFIRMED', 'CANCELLED');
    expect(res.valid).toBe(true);
    expect(res.targetStatus).toBe('CANCELLED');
  });

  test('should reject invalid transition from CONFIRMED to FAILED (late webhook)', () => {
    const res = BookingStateService.validateTransition('CONFIRMED', 'FAILED');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Invalid transition');
  });

  test('should reject invalid transition from CANCELLED to CONFIRMED', () => {
    const res = BookingStateService.validateTransition('CANCELLED', 'CONFIRMED');
    expect(res.valid).toBe(false);
  });

  test('should reject invalid transition from FAILED to CONFIRMED', () => {
    const res = BookingStateService.validateTransition('FAILED', 'CONFIRMED');
    expect(res.valid).toBe(false);
  });

  test('should treat same state transition as no-op valid', () => {
    const res = BookingStateService.validateTransition('CONFIRMED', 'CONFIRMED');
    expect(res.valid).toBe(true);
    expect(res.isNoop).toBe(true);
  });
});

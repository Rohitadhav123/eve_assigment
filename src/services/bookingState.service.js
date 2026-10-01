export class BookingStateService {
  static ALLOWED_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'],
    CONFIRMED: ['CANCELLED'],
    FAILED: [],
    CANCELLED: [],
  };

  /**
   * Check if state transition is allowed
   * @param {string} currentStatus
   * @param {string} nextStatus
   * @returns {boolean}
   */
  static canTransition(currentStatus, nextStatus) {
    if (!currentStatus || !nextStatus) return false;
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
  }

  /**
   * Evaluates state transition request.
   * If valid, returns { valid: true, targetStatus: nextStatus }.
   * If invalid (e.g. late webhook), returns { valid: false, reason: string, currentStatus }.
   */
  static validateTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) {
      return { valid: true, targetStatus: currentStatus, isNoop: true };
    }

    if (!this.canTransition(currentStatus, nextStatus)) {
      return {
        valid: false,
        reason: `Invalid transition from ${currentStatus} to ${nextStatus}`,
        currentStatus,
      };
    }

    return { valid: true, targetStatus: nextStatus, isNoop: false };
  }
}

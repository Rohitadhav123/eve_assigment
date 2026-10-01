import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for a payload.
 * @param {string|Buffer|object} payload
 * @param {string} secret
 * @returns {string} hex signature
 */
export const generateWebhookSignature = (payload, secret) => {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify signature using timing-safe comparison.
 * @param {string|Buffer|object} payload
 * @param {string} signatureHeader
 * @param {string} secret
 * @returns {boolean}
 */
export const verifyWebhookSignature = (payload, signatureHeader, secret) => {
  if (!signatureHeader || !secret) return false;
  try {
    const expectedSignature = generateWebhookSignature(payload, secret);
    const signatureBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
};

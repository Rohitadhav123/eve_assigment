import { AppError } from '../utils/error.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return next(new AppError('Invalid request data', 400, 'VALIDATION_ERROR', details));
  }
  req[source] = result.data;
  next();
};

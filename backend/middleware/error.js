function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  if (err.name === 'ValidationError') status = 400;
  else if (err.code === 11000) status = 409;

  // Log full detail server-side always; never send stack traces or internal
  // error messages to the client in production (information disclosure risk).
  console.error(err);

  const isProd = process.env.NODE_ENV === 'production';
  const message = err.code === 11000 ? 'That record already exists.' : (isProd && status === 500) ? 'Something went wrong' : (err.message || 'Server error');

  const body = { error: message };
  if (!isProd && err.stack) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = errorHandler;

// Middleware to prevent caching of sensitive pages
exports.noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

exports.preventAuth = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

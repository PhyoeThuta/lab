const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Auth service routes
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/auth'),
    })
  );

  // User service routes
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/users') || path.startsWith('/internal/users'),
    })
  );

  // Order service routes
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:3003',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/orders') || path.startsWith('/admin/orders'),
    })
  );
};

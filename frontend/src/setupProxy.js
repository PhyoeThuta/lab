const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Auth service routes
  app.use(
    createProxyMiddleware({
      target: 'https://auth-service-331164391857.asia-southeast1.run.app',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/auth'),
    })
  );

  // User service routes
  app.use(
    createProxyMiddleware({
      target: 'https://user-service-331164391857.asia-southeast1.run.app',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/users') || path.startsWith('/internal/users'),
    })
  );

  // Order service routes
  app.use(
    createProxyMiddleware({
      target: 'https://order-service-331164391857.asia-southeast1.run.app',
      changeOrigin: true,
      pathFilter: (path) => path.startsWith('/orders') || path.startsWith('/admin/orders'),
    })
  );
};

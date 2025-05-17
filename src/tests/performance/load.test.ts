import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
  },
};

export default function () {
  const BASE_URL = 'http://localhost:3000';

  // Homepage
  const homeResponse = http.get(BASE_URL);
  check(homeResponse, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in less than 1s': (r) => r.timings.duration < 1000,
  });

  // Product listing
  const productsResponse = http.get(`${BASE_URL}/api/products`);
  check(productsResponse, {
    'products status is 200': (r) => r.status === 200,
    'products load in less than 500ms': (r) => r.timings.duration < 500,
  });

  // Product detail
  const productResponse = http.get(`${BASE_URL}/api/products/test-product`);
  check(productResponse, {
    'product status is 200': (r) => r.status === 200,
    'product loads in less than 300ms': (r) => r.timings.duration < 300,
  });

  // Search functionality
  const searchResponse = http.get(`${BASE_URL}/api/products/search?q=test`);
  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search responds in less than 500ms': (r) => r.timings.duration < 500,
  });

  // Cart operations
  const cartResponse = http.post(`${BASE_URL}/api/cart`, {
    productId: 'test-product',
    quantity: 1,
  });
  check(cartResponse, {
    'cart update status is 200': (r) => r.status === 200,
    'cart updates in less than 300ms': (r) => r.timings.duration < 300,
  });
}
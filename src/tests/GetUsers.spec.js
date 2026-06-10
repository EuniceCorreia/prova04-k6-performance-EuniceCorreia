import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { sleep } from 'k6';

export const getProductsDuration = new Trend('get_products', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.30'],
    get_products: ['p(99)<500'],
    content_OK: ['rate>0.95']
  },
  stages: [
    { duration: '10s', target: 1 },
    { duration: '15s', target: 1 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/get-products.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

function parseProducts(body) {
  try {
    const response = JSON.parse(body);
    return Array.isArray(response.products) ? response.products : [];
  } catch {
    return [];
  }
}

export default function () {
  const baseUrl = 'https://dummyjson.com/products';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(baseUrl, params);
  const products = parseProducts(res.body);

  if (res.status !== OK) {
    console.error(`GET falhou: status ${res.status} - ${res.body}`);
  }

  getProductsDuration.add(res.timings.duration);

  RateContentOK.add(res.status === OK);

  check(res, {
    'GET Products - Status 200': () => res.status === OK,
    'GET Products - Lista possui produtos': () => products.length > 0
  });

  sleep(1);
}

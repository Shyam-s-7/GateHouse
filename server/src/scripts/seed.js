const User = require('../models/User');
const Service = require('../models/Service');
const ApiKey = require('../models/ApiKey');
const GatewayLog = require('../models/GatewayLog');
const { generateApiKey } = require('../utils/cryptoUtils');

async function seedDatabaseIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[Seed] Database already populated. Skipping initial seed.');
    return;
  }

  console.log('[Seed] Seeding default developer account and sample telemetry...');

  // 1. Create Default Developer Account
  const demoUser = await User.create({
    name: 'Alex Morgan',
    email: 'developer@gatehouse.io',
    password: 'Password123!',
    organization: 'Acme Cloud Platform',
    role: 'developer',
  });

  // 2. Create Sample Services
  const port = process.env.PORT || 5000;
  const ordersService = await Service.create({
    user: demoUser._id,
    name: 'Customer Orders API',
    slug: 'orders',
    targetUrl: `http://localhost:${port}/api/mock-upstream/orders`,
    description: 'High-volume e-commerce order processing backend',
    isActive: true,
    healthCheckPath: '',
    healthStatus: 'healthy',
    timeoutMs: 10000,
  });

  const productsService = await Service.create({
    user: demoUser._id,
    name: 'Product Inventory Service',
    slug: 'products',
    targetUrl: `http://localhost:${port}/api/mock-upstream/products`,
    description: 'Global SKU lookup and inventory levels',
    isActive: true,
    healthCheckPath: '',
    healthStatus: 'healthy',
    timeoutMs: 8000,
  });

  const publicService = await Service.create({
    user: demoUser._id,
    name: 'Public JSONPlaceholder Service',
    slug: 'jsonplaceholder',
    targetUrl: 'https://jsonplaceholder.typicode.com',
    description: 'External third-party REST API target for testing proxy forwarding',
    isActive: true,
    healthCheckPath: '/todos/1',
    healthStatus: 'healthy',
    timeoutMs: 12000,
  });

  // 3. Create Sample API Keys
  const key1Data = generateApiKey('live');
  const prodKey = await ApiKey.create({
    user: demoUser._id,
    name: 'Production Mobile App Key',
    keyPrefix: key1Data.keyPrefix,
    hashedKey: key1Data.hashedKey,
    rateLimit: {
      requests: 60,
      window: '1m',
      windowMs: 60000,
    },
    allowedServices: [ordersService._id, productsService._id],
    status: 'active',
    totalRequests: 480,
  });

  const key2Data = generateApiKey('live');
  const partnerKey = await ApiKey.create({
    user: demoUser._id,
    name: 'Partner Integration Secret',
    keyPrefix: key2Data.keyPrefix,
    hashedKey: key2Data.hashedKey,
    rateLimit: {
      requests: 20,
      window: '1m',
      windowMs: 60000,
    },
    allowedServices: [], // Unrestricted
    status: 'active',
    totalRequests: 142,
  });

  // 4. Generate 120+ Historical Gateway Logs over the last 7 days
  const sampleLogs = [];
  const statusCodes = [200, 200, 200, 200, 200, 200, 201, 200, 400, 429, 429, 200, 502, 404];
  const methods = ['GET', 'GET', 'GET', 'POST', 'GET'];
  const services = [ordersService, productsService, publicService];

  const now = Date.now();
  for (let i = 0; i < 140; i++) {
    // Spread across 7 days
    const hoursAgo = Math.floor(Math.random() * (7 * 24));
    const logTime = new Date(now - hoursAgo * 3600 * 1000 - Math.floor(Math.random() * 3600 * 1000));
    const service = services[Math.floor(Math.random() * services.length)];
    const key = Math.random() > 0.3 ? prodKey : partnerKey;
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];

    let latency = Math.floor(Math.random() * 85) + 18;
    if (statusCode === 429) latency = Math.floor(Math.random() * 8) + 2; // Fast rate limit response
    if (statusCode === 502) latency = Math.floor(Math.random() * 200) + 150;

    sampleLogs.push({
      user: demoUser._id,
      apiKeyId: key._id,
      apiKeyPrefix: key.keyPrefix,
      apiKeyName: key.name,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceName: service.name,
      method,
      path: `/gateway/${service.slug}${method === 'POST' ? '/create' : ''}`,
      upstreamUrl: `${service.targetUrl}`,
      statusCode,
      latencyMs: latency,
      ip: `192.168.1.${Math.floor(Math.random() * 100) + 10}`,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      errorMessage: statusCode === 429 ? 'Rate limit exceeded' : statusCode >= 400 ? 'Upstream error' : '',
      timestamp: logTime,
    });
  }

  await GatewayLog.insertMany(sampleLogs);

  console.log('[Seed] Demo data seeded successfully:');
  console.log('   - Demo User: developer@gatehouse.io / Password123!');
  console.log(`   - Sample API Key 1: ${key1Data.rawKey} (Production Mobile App)`);
  console.log(`   - Sample API Key 2: ${key2Data.rawKey} (Partner Integration)`);
  console.log('   - 3 Pre-configured Upstream Services');
  console.log(`   - ${sampleLogs.length} historical gateway analytics logs`);
}

module.exports = { seedDatabaseIfEmpty };

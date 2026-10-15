/**
 * Mock Upstream API Service
 * Built-in mock endpoints for immediate testing, proxy verification, and playground experimentation
 */

const mockOrders = [
  { id: 'ord_101', customer: 'Acme Corp', amount: 450.0, currency: 'USD', status: 'shipped', items: 3 },
  { id: 'ord_102', customer: 'Globex Ltd', amount: 1290.5, currency: 'USD', status: 'processing', items: 7 },
  { id: 'ord_103', customer: 'Soylent Inc', amount: 89.99, currency: 'USD', status: 'delivered', items: 1 },
  { id: 'ord_104', customer: 'Initech Labs', amount: 2400.0, currency: 'USD', status: 'pending', items: 12 },
  { id: 'ord_105', customer: 'Umbrella Tech', amount: 750.25, currency: 'USD', status: 'shipped', items: 4 },
];

const mockProducts = [
  { id: 'prod_901', name: 'Ultra Wireless Noise-Cancelling Headphones', price: 299.99, stock: 45, category: 'Electronics' },
  { id: 'prod_902', name: 'Ergonomic Mechanical Keyboard RGB', price: 149.5, stock: 120, category: 'Accessories' },
  { id: 'prod_903', name: '4K Ultra-Wide Curved Monitor 34"', price: 699.0, stock: 18, category: 'Hardware' },
  { id: 'prod_904', name: 'Precision USB-C Docking Station', price: 189.99, stock: 85, category: 'Hardware' },
];

const mockUsers = [
  { id: 'usr_001', name: 'Sarah Connor', email: 'sarah@resistance.org', role: 'DevOps Lead' },
  { id: 'usr_002', name: 'Neo Anderson', email: 'neo@matrix.io', role: 'Principal Architect' },
  { id: 'usr_003', name: 'Ada Lovelace', email: 'ada@computing.org', role: 'Algorithm Engineer' },
];

exports.getOrders = (req, res) => {
  res.json({
    service: 'Mock Orders Backend Service',
    total: mockOrders.length,
    data: mockOrders,
    metadata: {
      generatedAt: new Date().toISOString(),
      server: 'Gatehouse Mock Target',
    },
  });
};

exports.getOrderById = (req, res) => {
  const order = mockOrders.find((o) => o.id === req.params.id) || mockOrders[0];
  res.json({
    service: 'Mock Orders Backend Service',
    data: order,
  });
};

exports.createOrder = (req, res) => {
  const newOrder = {
    id: `ord_${Date.now()}`,
    customer: req.body.customer || 'New Enterprise Client',
    amount: req.body.amount || 199.99,
    currency: 'USD',
    status: 'created',
    items: req.body.items || 1,
    createdAt: new Date().toISOString(),
  };
  res.status(201).json({
    success: true,
    message: 'Order created successfully on mock upstream target',
    data: newOrder,
  });
};

exports.getProducts = (req, res) => {
  res.json({
    service: 'Mock Product Catalog Service',
    total: mockProducts.length,
    data: mockProducts,
  });
};

exports.getUsers = (req, res) => {
  res.json({
    service: 'Mock Identity Service',
    total: mockUsers.length,
    data: mockUsers,
  });
};

exports.echo = (req, res) => {
  res.json({
    service: 'Mock Echo Diagnostics',
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString(),
  });
};

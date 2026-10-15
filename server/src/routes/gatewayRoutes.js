const express = require('express');
const router = express.Router();
const proxyEngine = require('../middleware/proxyEngine');

// Catch-all route for proxying requests:
// e.g. /gateway/orders
//      /gateway/orders/123
//      /gateway/products/search?q=phone
router.all('/:serviceSlug*', proxyEngine);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  getProducts,
  getUsers,
  echo,
} = require('../controllers/mockUpstreamController');

router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', createOrder);

router.get('/products', getProducts);
router.get('/users', getUsers);

router.all('/echo', echo);

module.exports = router;

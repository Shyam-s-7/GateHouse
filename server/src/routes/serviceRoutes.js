const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  testServicePing,
} = require('../controllers/serviceController');
const { protect } = require('../middleware/auth');

router.use(protect); // All service routes require developer authentication

router.route('/')
  .get(getServices)
  .post(createService);

router.route('/:id')
  .get(getServiceById)
  .put(updateService)
  .delete(deleteService);

router.post('/:id/test-ping', testServicePing);

module.exports = router;

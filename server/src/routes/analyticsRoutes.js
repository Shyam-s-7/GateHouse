const express = require('express');
const router = express.Router();
const {
  getKpis,
  getTrafficTimeline,
  getStatusDistribution,
  getServicesBreakdown,
  getLogs,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect); // Analytics are protected for logged-in developers

router.get('/kpis', getKpis);
router.get('/timeline', getTrafficTimeline);
router.get('/status-distribution', getStatusDistribution);
router.get('/services-breakdown', getServicesBreakdown);
router.get('/logs', getLogs);

module.exports = router;

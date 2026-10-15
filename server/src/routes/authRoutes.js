const express = require('express');
const router = express.Router();
const { register, login, getMe, demoLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);   // Instant demo access — self-seeding, no credentials needed
router.get('/me', protect, getMe);

module.exports = router;

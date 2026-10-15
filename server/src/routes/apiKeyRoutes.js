const express = require('express');
const router = express.Router();
const {
  getApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
} = require('../controllers/apiKeyController');
const { protect } = require('../middleware/auth');

router.use(protect); // All key routes require developer authentication

router.route('/')
  .get(getApiKeys)
  .post(createApiKey);

router.route('/:id')
  .get(getApiKeyById)
  .put(updateApiKey)
  .delete(deleteApiKey);

router.post('/:id/revoke', revokeApiKey);

module.exports = router;

const express = require('express');
const { checkDatabase } = require('../config/db');
const asyncHandler = require('../middleware/async.middleware');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'chateau254-backend' });
});

router.get('/db', asyncHandler(async (req, res) => {
  const database = await checkDatabase();
  res.json({ status: 'ok', database });
}));

module.exports = router;

const express = require('express');
const { getStories } = require('../controllers/storyApi');
const router = express.Router();

// get products
router.route('/all').get(getStories);

module.exports = router;
const express = require('express');
const { getProductPage } = require('../controllers/productController');
const router = express.Router();

// get products
router.route('/').get(getProductPage);

module.exports = router;
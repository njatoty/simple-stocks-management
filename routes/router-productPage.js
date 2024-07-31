const express = require('express');
const { getProductListPage, getStocksCalendarPage } = require('../controllers/productController');
const router = express.Router();

// get products
router.route('/list').get(getProductListPage);
router.route('/stocks-calendar').get(getStocksCalendarPage);

module.exports = router;
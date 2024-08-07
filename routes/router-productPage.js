const express = require('express');
const { getProductListPage, getStocksCalendarPage, getDashBoardPage, getStoryPage } = require('../controllers/productController');
const router = express.Router();

// get products
router.route('/list').get(getProductListPage);
router.route('/stocks-calendar').get(getStocksCalendarPage);
router.route('/dashboard').get(getDashBoardPage);
router.route('/story').get(getStoryPage);

module.exports = router;
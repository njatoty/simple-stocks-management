const express = require('express');
const { createProduct, updateProduct, deleteProduct, fetchProducts, fetchProductById, cancelExitProduct, filteredStocks, fetchWeeklyTransactions, fetchGroups, createGroup, updateGroup, fetchActionRecents, getProductDailyTransactions, fetchAllActions, addActionProduct, updateActionProduct, cancelActionProduct } = require('../controllers/productApi');
const router = express.Router();

// get products
router.route('/').get(fetchProducts);
// create product
router.route('/create').post(createProduct);
// put and delete product
router.route('/:id').get(fetchProductById).put(updateProduct).delete(deleteProduct);
// add action product
router.route('/action').post(addActionProduct);
router.route('/action/:id').put(updateActionProduct);
router.route('/action/cancel').post(cancelActionProduct);
// filtering
router.route('/stock/filter').get(filteredStocks);
// weekly transactions (entries and exits)
router.route('/stock/weekly-transactions').get(fetchWeeklyTransactions);
// Product Group
router.route('/groups/all').get(fetchGroups).post(createGroup);
router.route('/groups/update/:id').put(updateGroup);
// Action recents
router.route('/actions/recents/:id?').get(fetchActionRecents);
// Daily transactions
router.route('/actions/daily/:id?').get(getProductDailyTransactions);
router.route('/actions/all').get(fetchAllActions);


module.exports = router;
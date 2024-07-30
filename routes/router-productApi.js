const express = require('express');
const { createProduct, updateProduct, deleteProduct, addExitProduct, addEntryProduct, fetchProducts, fetchProductById, cancelExitProduct, cancelEntryProduct, updateExitProduct, updateEntryProduct, filteredStocks, fetchWeeklyTransactions, fetchGroups, createGroup, updateGroup, fetchActionRecents } = require('../controllers/productApi');
const router = express.Router();

// get products
router.route('/').get(fetchProducts);
// create product
router.route('/create').post(createProduct);
// put and delete product
router.route('/:id').get(fetchProductById).put(updateProduct).delete(deleteProduct);
// add exit product
router.route('/exit').post(addExitProduct);
router.route('/exit/:id').put(updateExitProduct);
router.route('/exit/cancel').post(cancelExitProduct);
// add entry product
router.route('/entry').post(addEntryProduct);
router.route('/entry/:id').put(updateEntryProduct);
router.route('/entry/cancel').post(cancelEntryProduct);
// filtering
router.route('/stock/filter').get(filteredStocks);
// weekly transactions (entries and exits)
router.route('/stock/weekly-transactions').get(fetchWeeklyTransactions);
// Product Group
router.route('/groups/all').get(fetchGroups).post(createGroup);
router.route('/groups/update/:id').put(updateGroup);
// Action recents
router.route('/actions/recents/:id?').get(fetchActionRecents);


module.exports = router;
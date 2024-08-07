const express = require('express');
const { createNewUser } = require('../controllers/userApi');
const router = express.Router();

// get products
router.route('/create').post(createNewUser);

module.exports = router;
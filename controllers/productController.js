const { default: mongoose } = require("mongoose");
const Action = require("../models/ActionModel");
const Product = require("../models/ProductModel");
const moment = require('moment');

// method to get all products (GET)
async function getProductPage(req, res) {
    
    return res.render('product/list');
}

module.exports = {
    getProductPage
}
    
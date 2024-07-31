const { default: mongoose } = require("mongoose");
const Action = require("../models/ActionModel");
const Product = require("../models/ProductModel");
const moment = require('moment');

// method to get all products (GET)
async function getProductListPage(req, res) {
    
    return res.render('product/list');
}


// method to get all products (GET)
async function getStocksCalendarPage(req, res) {
    
    return res.render('product/stocks-calendar.ejs', {
        title: "Calendrier des Stocks"
    });
}

module.exports = {
    getProductListPage,
    getStocksCalendarPage
}
    
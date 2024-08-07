const { default: mongoose } = require("mongoose");
const Action = require("../models/ActionModel");
const Product = require("../models/ProductModel");
const moment = require('moment');

// method to get all products (GET)
async function getProductListPage(req, res) {
    
    return res.render('product/list');
}

// method to get darhboard page (GET)
async function getDashBoardPage(req, res) {
    
    return res.render('product/dashboard', {
        title: "Tableau de bord"
    });
}


// method to get all products (GET)
async function getStocksCalendarPage(req, res) {
    
    return res.render('product/stocks-calendar.ejs', {
        title: "Calendrier"
    });
}

async function getStoryPage(req, res) {

    return res.render('product/story.ejs', {
        title: "Historiques"
    });
}

module.exports = {
    getProductListPage,
    getStocksCalendarPage,
    getDashBoardPage,
    getStoryPage
}
    
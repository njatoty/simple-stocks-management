const express = require('express');
const app = express();
const port = 3000;
const apiRouter = require('./routes/router-productApi');
const pageRouter = require('./routes/router-productPage');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");


mongoose.connect(
    'mongodb+srv://njato:stock00@clusterstock.qiwoakh.mongodb.net/?retryWrites=true&w=majority&appName=Clusterstock', {
    rejectUnauthorized: true,
    
}).then(() => {
    console.log('MongoDB connected!')
}).catch((error) => {
    throw error
});

// Set the view engine to ejs
app.set('view engine', 'ejs');
// allow security
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.set('views', path.join(__dirname, 'views'));

// routers
app.use('/api/product', apiRouter);
app.use('/product', pageRouter);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

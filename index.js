const express = require('express');
const app = express();
const port = 3000;
const apiRouter = require('./routes/router-productApi');
const apiUserRouter = require('./routes/router-userApi');
const apiStoryRouter = require('./routes/router-storyApi');
const pageRouter = require('./routes/router-productPage');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const expressLayouts = require('express-ejs-layouts');

const uri = 'mongodb+srv://njato:stock00@clusterstock.qiwoakh.mongodb.net/?retryWrites=true&w=majority&appName=Clusterstock';
mongoose.connect(uri, {
    rejectUnauthorized: true,
}).then(() => {
    console.log('MongoDB connected!')
}).catch((error) => {
    throw error
});


async function cloneCollection() {
    try {
        // Connect to the MongoDB database
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

        const sourceCollection = mongoose.connection.collection('actions');
        const targetCollection = mongoose.connection.collection('newactions');

        // Optional: Clear the target collection before copying
        await targetCollection.deleteMany({});

        // Find all documents in the source collection
        const documents = await sourceCollection.find().toArray();

        // Insert documents into the target collection
        if (documents.length > 0) {
            await targetCollection.insertMany(documents);
        }

        console.log('Collection cloned successfully');
    } catch (error) {
        console.error('Error cloning collection:', error);
    } finally {
        // Disconnect from the MongoDB database
        await mongoose.disconnect();
    }
}

// cloneCollection();

// Set the view engine to ejs
app.use(expressLayouts)
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
app.use('/api/user', apiUserRouter);
app.use('/api/story', apiStoryRouter);
app.use('/product', pageRouter);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

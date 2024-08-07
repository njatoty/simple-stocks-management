const { default: mongoose } = require("mongoose");
const Action = require("../models/ActionModel");
const Product = require("../models/ProductModel");
const moment = require('moment');
const Group = require("../models/ProductGroupModel");
const Story = require("../models/StoryModel");

const defaultUserId = '66b3261bffe5b3c2f1601856';

// method to get all products (GET)
async function fetchProducts(req, res) {
    try {
        const products = await Product.find().populate('group');
        res.json({
            ok: true,
            data: products
        });
    } catch (err) {
        console.log(err);
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// method to get product by Id (GET)
async function fetchProductById(req, res) {
    try {
        const { id } = req.params;
        const products = await Product.findById(id).populate('group');
        res.json({
            ok: true,
            data: products
        });
    } catch (err) {
        console.log(err);
        // handle duplication
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// method to create a new product (POST)
async function createProduct(req, res) {
    console.log(req.body)
    try {
        const product = await Product.create(req.body);

        // if the quantity is more than 0
        if (product.quantityAvailable > 0) {
            // insert entry
            await Action.create({
                type: 'entry',
                product: product._id,
                // remaining quantity
                remaining: product.quantityAvailable,
                quantity: product.quantityAvailable,
                date: product.date,
                user: defaultUserId
            });

        }

        res.json({
            ok: true,
            data: product
        });
    } catch (err) {
        console.log(err);
        // handle duplication error
        if (err.code === 11000) {
            // for name
            if ('name' in err.keyValue) {
                return res.json({
                    ok: false,
                    message: `Le nom du produit (${err.keyValue.name}) a été déjà enregistré.`
                });
            }

        }
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// method to update product (PUT)
async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const updated = await Product.findByIdAndUpdate(id, {
            user: defaultUserId,
            ...req.body
        }, { new: true });

        res.json({
            ok: true,
            data: updated
        });
    } catch (err) {
        console.log(err);
        // handle duplication error
        if (err.code === 11000) {
            // for name
            if ('name' in err.keyValue) {
                return res.json({
                    ok: false,
                    message: `Le nom du produit (${err.keyValue.name}) a été déjà enregistré.`
                });
            }

        }
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// method to delete product by id (DELETE)
async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        const deleted = await Product.findByIdAndDelete(id, { new: true });
        res.json({
            ok: true,
            data: deleted
        });
    } catch (err) {
        console.log(err);
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

/**
 * ACTION 
 */
// method to do action (EXIT if quantity is negative. ENTRY if quantity is positive) product (POST)
async function addActionProduct(req, res) {
    try {

        var { productId, quantity, date, ...rest } = req.body;

        // parse it quantity
        quantity = parseInt(quantity);
        // type d'action
        let type = quantity > 0 ? 'entry' : 'exit';
        // select the product
        const product = await Product.findById(productId);

        // there is product
        if (product.quantityAvailable + quantity >= 0) {
            // insert exit product
            const action = await Action.create({
                type: type,
                product: productId,
                quantity: Math.abs(quantity), // always a positive number
                // remaining quantity
                remaining: product.quantityAvailable + quantity,
                date: addCurrentTimeToDate(date).toDate(),
                user: defaultUserId,
                ...rest
            });

            // decrease available product quantity
            const editedProduct = await Product.findByIdAndUpdate(productId, {
                quantityAvailable: product.quantityAvailable + quantity
            }, { new: true });

            // insert story
            Story.create({
                user: defaultUserId,
                product: editedProduct.id,
                productAction: action._id,
                count: quantity,
                action: 'C',
                target: type,
                comment: "Faire une action sur un produit"
            });
    
            res.json({
                ok: true,
                action: action,
                product: editedProduct
            });
            
        } else {
            
            res.json({
                ok: false,
                message: `Il n'y a plus de ${product.name} disponible.`
            });
        }

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: "Error"
        });
    }
}


// method to cancel exit (POST)
async function cancelActionProduct(req, res) {
    try {

        const { actionId } = req.body;

        // find exit and get product
        const action = await Action.findById(actionId).populate('product');
        if (!action) {
            return res.json({
                ok: false,
                message: 'Action introuvable!'
            })
        }
        // select the product
        const product = action.product;

        // quantity to adjust
        const quantity = action.type === 'entry' ? -action.quantity : action.quantity

        // update product (restore quantity)
        const updatedProduct = await Product.findByIdAndUpdate(product._id, {
            quantityAvailable: product.quantityAvailable + quantity
        }, { new: true });

        // delete action
        const deletedAction = await Action.findByIdAndDelete(action._id);

        
        // insert story
        Story.create({
            user: defaultUserId,
            product: updatedProduct._id,
            productAction: action._id,
            count: quantity,
            action: 'c',
            target: action.type,
            comment: "Faire une action sur un produit le " + action.date.toLocaleDateString('fr')
        });

        res.json({
            ok: true,
            canceled: deletedAction,
            product: updatedProduct
        });

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: "Error"
        });
    }
}

// method to update Action (PUT)
async function updateActionProduct(req, res) {
    try {

        // id of the action
        const { id } = req.params;
        const { quantity, date, action: actionType } = req.body;
        
        // get current action
        var action = await Action.findById(id).populate('product');

        // if action is null
        if (!action) {
            
            return res.json({
                ok: false,
                message: "Aucune entrée trouvée"
            });
        }

        // difference of quantity
        var diff = Math.abs(quantity) - action.quantity;

        // check if there is a change in action type
        if (actionType !== action.type) {
            if (actionType === 'entry')
                diff = quantity + action.quantity;
            else if (actionType === 'exit')
                diff = quantity - action.quantity;
        } else {
            if (action.type === 'exit') {
                // convert to negative number
                diff = -diff;
            }
        }

        if (diff + action.product.quantityAvailable < 0) {
            return res.json({
                ok: false,
                message: 'La modification a engendré une quantité négative du produit restant'
            })
        }

        // update quantity of the action
        action.quantity = Math.abs(quantity);
        action.type = actionType;
        if (date) action.date = changeDateKeepTime(date, action.date).toDate();
        await action.save();

        // Adjust remaining quantities of posterior records
        const subsquentActions = await Action.find({
            product: action.product._id,
            date: {
                $gte: action.date
            }
        }).sort({
            date: 'desc'
        });

        for (let i = 0; i < subsquentActions.length; i++) {
            const sa = subsquentActions[i];
            sa.remaining += diff;
            // console.log(sa.type, sa.date, sa.remaining)
            // update
            sa.save();
        }

        // console.log('Rest:', diff + action.product.quantityAvailable)
        // update also product (change available quantity)
        const updatedProduct = await Product.findByIdAndUpdate(action.product._id, {
            quantityAvailable: diff + action.product.quantityAvailable
        }, { new: true });
        
        
        // insert story
        Story.create({
            user: defaultUserId,
            product: updatedProduct.id,
            productAction: action._id,
            count: quantity,
            action: 'U',
            target: actionType,
            comment: "Faire une action sur un produit"
        });
    

        res.json({
            ok: true,
            action: action,
            product: updatedProduct
        });

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: "Error"
        });
    }
}


// STOCK filter
// to get exit and entry (by year and month)
async function filteredStocks(req, res) {

    const { month, year, productId} = req.query;

    if (!month || !year || !productId) {
        return res.json({
            ok: false,
            message: "Rassurez-vous que les paramètres 'month', 'year' et 'productId' sont bien tous passez sur l'URL"
        })
    }

    const product = await Product.findById(productId);

    if (!product) {
        return res.json({
            ok: false,
            message: 'Product not found'
        })
    }
    
    let startDate = moment().month(month).year(year).startOf('month');
    let endDate = moment().month(month).year(year).endOf('month');

    const stocks = await Action.aggregate([
        {
            $match: {
                product: product._id,
                date: {
                    $gte: startDate.toDate(),
                    $lte: endDate.toDate()
                }
            }
        },
        {
            
            $group: {
                _id: {
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                    day: { $dayOfMonth: "$date" },
                    product: "$productDetails.name"
                },
                entries: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "entry"] }, "$quantity", 0]
                    }
                },
                exits: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "exit"] }, "$quantity", 0]
                    }
                },
                remaining: { $last: "$remaining" }
            }
        },
        {
            $project: {
                date: {
                    $dateFromParts: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day"
                    }
                },
                entries: 1,
                exits: 1,
                remaining: 1
            }
        },
        {
            $sort: {
                date: 1,
            }
        }
    ]);

    res.json({
        ok: true,
        product: product,
        transactions: stocks
    })

}



// to get exit and entry (by year and month)
async function fetchWeeklyTransactions(req, res) {
    
    // get this week (start and end)
    const startDate = moment().startOf('week');
    const endDate = moment().endOf('week');
    
    const transactions = await Action.aggregate([
        {
            $match: {
                date: {
                    $gte: startDate.toDate(),
                    $lte: endDate.toDate()
                }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                    day: { $dayOfMonth: "$date" },
                    product: "$productDetails.name"
                },
                entries: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "entry"] }, "$quantity", 0]
                    }
                },
                exits: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "exit"] }, "$quantity", 0]
                    }
                },
                remaining: { $last: "$remaining" }
            }
        },
        {
            $project: {
                date: {
                    $dateFromParts: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day"
                    }
                },
                entries: 1,
                exits: 1,
                remaining: 1
            }
        },
        {
            $sort: {
                date: 1,
            }
        }
    ]);

    res.json({
        ok: true,
        reports: transactions
    })

}


// product group
// method to fetch Group (GET)
async function fetchGroups(req, res) {
    console.log('fetch...')
    try {
        const groups = await Group.find();
        res.json({
            ok: true,
            data: groups
        });
    } catch (err) {
        console.log(err);
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// method to create a new group (POST)
async function createGroup(req, res) {
    try {
        const created = await Group.create({
            name: req.body.name
        });
        res.json({
            ok: true,
            data: created
        });
    } catch (err) {
        console.log(err);
        // handle duplication error
        if (err.code === 11000) {
            // for name
            if ('name' in err.keyValue) {
                return res.json({
                    ok: false,
                    message: `Le nom du group (${err.keyValue.name}) a été déjà enregistré.`
                });
            }

        }
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}


// method to update group (PUT)
async function updateGroup(req, res) {
    try {
        const { id } = req.params;
        const updated = await Group.findByIdAndUpdate(id, req.body, { new: true });
        res.json({
            ok: true,
            data: updated
        });
    } catch (err) {
        console.log(err);
        // handle duplication error
        if (err.code === 11000) {
            // for name
            if ('name' in err.keyValue) {
                return res.json({
                    ok: false,
                    message: `Le nom du group (${err.keyValue.name}) a été déjà enregistré.`
                });
            }

        }
        res.json({
            ok: false,
            message: 'Error'
        });
    }
}

// get actions recent activities by product id
async function fetchActionRecents(req, res) {

    const {id} = req.params;

    let filter = id ? {product: id} : {};

    let { limit = Number.MAX_SAFE_INTEGER, today } = req.query;

    // other filter
    let ofilter = {};
    if (today === 'true') {
        ofilter = {
            ...ofilter,
            updateAt: { $gte: moment().startOf('day').toDate() }
        }
    }

    const actions = await Action.find({
        ...ofilter,
        ...filter
    })
    .sort({ date: 'desc'})
    .populate('product')
    .limit(limit);

    res.json({
        ok: true,
        data: actions
    });

}

// get actions recent activities by product id
async function fetchAllActions(req, res) {

    const {year, month} = req.query;

    try {
        var filter = {};
        if (month && month !== '0') filter = { month: +month }
        if (year) filter = { ...filter, year: +year }
    
        const actions = await Action.aggregate([
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        month: { $month: "$date" },
                        year: { $year: "$date" },
                        product: "$product"
                    },
                    entries: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "entry"] }, "$quantity", 0]
                        }
                    },
                    exits: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "exit"] }, "$quantity", 0]
                        }
                    },
                    transactions: { $push: "$$ROOT" },
                    latestRemaining: { $last: "$remaining" }
                }
            },
            {
                $lookup: {
                    from: "products", // The collection name for Product
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    product: { $mergeObjects: "$productDetails" },
                    entries: 1,
                    exits: 1,
                    transactions: 1,
                    month: "$_id.month",
                    year: "$_id.year",
                    remaining: "$latestRemaining"
                }
            },
            {
                $match: {
                    ...filter
                }
            },
            {
                $sort: {
                    date: 1,
                    "product.name": 1
                }
            }
        ]);
    
        res.json({
            ok: true,
            data: actions
        });
    
    } catch(err) {
        res.json({
            ok: false,
            data: []
        });
    }
}

// get daily transactions
async function getProductDailyTransactions(req, res) {
    try {
        const { id } = req.params;

        const filter = (id) ? {product: new mongoose.Types.ObjectId(id)} : {};

        const transactions = await Action.aggregate([
            {
                $match: {
                    ...filter
                }
            },
            {
                $group: {
                    _id: {
                        product: "$product",
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        day: { $dayOfMonth: "$date" }
                    },
                    totalQuantity: { $sum: "$quantity" },
                    transactions: { $push: "$$ROOT" }
                }
            },
            {
                $lookup: {
                    from: "products", // The collection name for Product
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    product: { $mergeObjects: "$productDetails" },
                    totalQuantity: 1,
                    transactions: 1
                }
            },
            {
                $sort: {
                    date: 1
                }
            }
        ]);

        console.log(transactions);

        res.json({
            ok: true,
            data: transactions
        });
    } catch (error) {
        console.error(error);

        res.json({
            ok: false,
            message: 'error'
        });
    }
}


// method to get historical trends

async function getHistoricalTrends(req, res) {
    const result = await Action.aggregate([
        {
            $group: {
                _id: {
                    product: '$product',
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
                },
                totalQuantity: {
                    $sum: {
                        $cond: [
                            { $eq: ['$type', 'entry'] },
                            '$quantity',
                            { $multiply: ['$quantity', -1] }
                        ]
                    }
                },
                remaining: { $last: '$remaining' },
                type: { $last: '$type' }
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id.product',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        {
            $unwind: '$productDetails'
        },
        {
            $sort: { '_id.date': 1 }
        },
        {
            $group: {
                _id: '$_id.date',
                products: {
                    $push: {
                        product: '$productDetails.name',
                        quantity: '$totalQuantity',
                        remaining: '$remaining',
                        type: '$type'
                    }
                }
            }
        },
        {
            $sort: { '_id': 1 }
        }
    ]);

    return res.json({
        ok: true,
        data: result
    });
}

function addCurrentTimeToDate(dateString) {
    // Parse the given date string to a Moment object
    let givenDate = moment(dateString);
    // Get the current time using Moment
    let currentTime = moment();
    // Set the time components of the given date to the current time
    givenDate.set({
        hour: currentTime.hour(),
        minute: currentTime.minute(),
        second: currentTime.second(),
        millisecond: currentTime.millisecond()
    });
    
    return givenDate;
}


function changeDateKeepTime(dateString, oldDateString) {
    // Parse the given date string to a Moment object
    let givenDate = moment(dateString);
    // Get the current date and time using Moment
    let currentDateTime = moment(oldDateString);
    // Set the date components of the current date and time to those of the given date
    currentDateTime.set({
        year: givenDate.year(),
        month: givenDate.month(), // month is 0-indexed in Moment.js
        date: givenDate.date()
    });
    return currentDateTime;
}


module.exports = {
    fetchProducts, createProduct, updateProduct, deleteProduct,
    addActionProduct, fetchProductById,
    // cancel
    cancelActionProduct,
    // udpate (:id)
    updateActionProduct,
    // filtered by month and year
    filteredStocks,
    // weekly trasactions
    fetchWeeklyTransactions,
    // GROUP
    fetchGroups, createGroup, updateGroup,
    // action recents
    fetchActionRecents,
    // daily transactions
    getProductDailyTransactions,
    fetchAllActions,
    getHistoricalTrends
};
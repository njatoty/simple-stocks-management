const { default: mongoose } = require("mongoose");
const Action = require("../models/ActionModel");
const Product = require("../models/ProductModel");
const moment = require('moment');
const Group = require("../models/ProductGroupModel");

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
                date: product.date
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
        const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
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
// method to do action (EXIT if quanity is negative. ENTRY if quantity is positive) product (POST)
async function addActionProduct(req, res) {
    try {

        var { productId, quantity, ...rest } = req.body;

        // parse it quantity
        quantity = parseInt(quantity);
        // type d'action
        let type = quantity > 0 ? 'entry' : 'exit';
        // select the product
        const product = await Product.findById(productId);

        console.log(product.quantityAvailable + quantity)
        // there is product
        if (product.quantityAvailable + quantity >= 0) {
            // insert exit product
            const exitedProduct = await Action.create({
                type: type,
                product: productId,
                quantity: Math.abs(quantity), // always positive number
                // remaining quantity
                remaining: product.quantityAvailable + quantity,
                ...rest
            });

            // decrease available product quantity
            const editedProduct = await Product.findByIdAndUpdate(productId, {
                quantityAvailable: product.quantityAvailable + quantity
            }, { new: true });
    
            res.json({
                ok: true,
                action: exitedProduct,
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
        const { quantity } = req.body;

        // si la quantité est négative
        const newType = (quantity < 0) ? 'exit' : 'entry';
        quantity = (quantity < 0) ? -quantity : quantity;
        
        // get current action
        const action = await Action.findById(id).populate('product');

        // if action is null
        if (!action) {
            
            return res.json({
                ok: false,
                message: "Aucune entrée trouvée"
            });
        }

        
        // update action
        const updatedAction = await Action.findByIdAndUpdate(id, {
            type: newType,
            quantity: quantity
        }, { new: true });

        // update also product (change available quantity)
        const updatedProduct = await Product.findByIdAndUpdate(action.product._id, {
            quantityAvailable: action.product.quantityAvailable - action.quantity + updatedAction.quantity
        }, { new: true });

        /**
            entry = 10
            newEntry = 5
            product = 14
            qty = product - entry + newEntry
        **/

        res.json({
            ok: true,
            action: updatedAction,
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

    let today = moment().startOf('day').toDate();

    const actions = await Action.find({
        updatedAt: {
            $gte: today
        },
        ...filter
    })
    .sort({ updatedAt: 'desc'})
    .populate('product');

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
    fetchAllActions
};
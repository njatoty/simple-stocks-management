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
        const created = await Product.create(req.body);
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
 * EXIT 
 */
// method to add exit product (POST)
async function addExitProduct(req, res) {
    try {

        const { productId, quantity, ...rest } = req.body;

        // select the product
        const product = await Product.findById(productId);

        // there is product
        if (product.quantityAvailable >= quantity) {
            // insert exit product
            const exitedProduct = await Action.create({
                type: 'exit',
                product: productId,
                quantity: quantity,
                // remaining quantity
                remaining: product.quantityAvailable - quantity,
                ...rest
            });

            // decrease available product quantity
            const editedProduct = await Product.findByIdAndUpdate(productId, {
                quantityAvailable: product.quantityAvailable - exitedProduct.quantity
            }, { new: true });
    
            res.json({
                ok: true,
                exited: exitedProduct,
                product: editedProduct
            });
            
        } else {
            
            res.json({
                ok: false,
                message: `Aucun produit (${product.name}) disponible.`
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
async function cancelExitProduct(req, res) {
    try {

        const { exitId } = req.body;

        // find exit and get product
        const exit = await Action.findById(exitId).populate('product');
        // select the product
        const product = exit.product;

        // update product (restore quantity)
        const updatedProduct = await Product.findByIdAndUpdate(product._id, {
            quantityAvailable: product.quantityAvailable + exit.quantity
        }, { new: true });

        // delete exit
        const deleteExit = await Action.findByIdAndDelete(exit._id);

        res.json({
            ok: true,
            canceled: deleteExit,
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

async function updateExitProduct(req, res) {
    try {

        /**
            exit = 1
            newExit = 2
            product = 16
            qty = product + entry - newEntry
        **/
        // id of the exit
        const { id } = req.params;
        const { quantity } = req.body;

        // si la quantité est négative
        if (quantity < 0) {
            return res.json({
                ok: false,
                message: "La valeur de la quantité ne doit pas être négative."
            })
        }

        // get current exit
        const exit = await Action.findById(id).populate('product');

        // if exit is not found
        if (!exit) {
            return res.json({
                ok: false,
                message: "Aucune sortie trouvée"
            });
        }

        // check available quantity if (calcul result is a negative number)
        if (exit.product.quantityAvailable + exit.quantity - quantity < 0) {
            return res.json({
                ok: false,
                message: `La nouvelle quantité a dépassé celle du produit (disponible: ${exit.product.quantityAvailable}, sortie: ${exit.quantity})`
            });
        }

        // to get product quantity (remain + quantity)
        let productQty = exit.remain + exit.quantity;
        
        // update exit
        const updatedExit = await Action.findByIdAndUpdate(id, {
            remaining: productQty - quantity,
            ...req.body
        }, { new: true });

        // update also product (change available quantity)
        const updatedProduct = await Product.findByIdAndUpdate(exit.product._id, {
            quantityAvailable: exit.product.quantityAvailable + exit.quantity - updatedExit.quantity
        }, { new: true });


        res.json({
            ok: true,
            exit: updatedExit,
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


/**
 * ENTRY 
 */
// method to add entry product (POST)
async function addEntryProduct(req, res) {
    try {

        const { productId, quantity, ...rest } = req.body;

        // select the product
        const product = await Product.findById(productId);

        // insert exit product
        const enteredProduct = await Action.create({
            type: 'entry',
            product: productId,
            // remaining quantity
            remaining: product.quantityAvailable + quantity,
            quantity: quantity,
            ...rest
        });

        // decrease available product quantity
        const editedProduct = await Product.findByIdAndUpdate(productId, {
            quantityAvailable: product.quantityAvailable + enteredProduct.quantity
        }, { new: true });

        res.json({
            ok: true,
            entered: enteredProduct,
            product: editedProduct
        });
        
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: "Error"
        });
    }
}

// method to cancel entry (POST)
async function cancelEntryProduct(req, res) {
    try {

        const { entryId } = req.body;

        // find entry and get product
        const entry = await Action.findById(entryId).populate('product');

        if (entry) {

            // select the product
            const product = entry.product;

            // update product (restore quantity)
            const updatedProduct = await Product.findByIdAndUpdate(product._id, {
                quantityAvailable: product.quantityAvailable - entry.quantity
            }, { new: true });

            // delete entry
            const deletedEntry = await Action.findByIdAndDelete(entry._id);

            res.json({
                ok: true,
                canceled: deletedEntry,
                product: updatedProduct
            });
        } else {
            res.json({
                ok: false,
                message: `Entry with _id: ${entryId} not found!`
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


// method to update entry (PUT)
async function updateEntryProduct(req, res) {
    try {

        // id of the entry
        const { id } = req.params;
        const { quantity } = req.body;

        // si la quantité est négative
        if (quantity < 0) {
            return res.json({
                ok: false,
                message: "La valeur de la quantité ne doit pas être négative."
            })
        }
        
        // get current entry
        const entry = await Action.findById(id).populate('product');

        // if entry is null
        if (!entry) {
            
            return res.json({
                ok: false,
                message: "Aucune entrée trouvée"
            });
        }

        
        // update entry
        const updatedEntry = await Action.findByIdAndUpdate(id, {
            ...req.body
        }, { new: true });

        // update also product (change available quantity)
        const updatedProduct = await Product.findByIdAndUpdate(entry.product._id, {
            quantityAvailable: entry.product.quantityAvailable - entry.quantity + updatedEntry.quantity
        }, { new: true });

        /**
            entry = 10
            newEntry = 5
            product = 14
            qty = product - entry + newEntry
        **/

        res.json({
            ok: true,
            entry: updatedEntry,
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
    console.log('not')
    try {
        const created = await Group.create(req.body);
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
        if (month) filter = { month: +month }
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
    addEntryProduct, addExitProduct, fetchProductById,
    // cancel
    cancelExitProduct, cancelEntryProduct,
    // udpate (:id)
    updateEntryProduct, updateExitProduct,
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
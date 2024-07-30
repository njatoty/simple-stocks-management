const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true        
    },
    description: String,
    date: {
        type: Date,
        default: Date.now
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'ProductGroup',
        required: true
    },
    category: {  // Matériel ou Consommable
        type: String,
        enum: ['Matériel', 'Consommable'],
        default: 'Consommable'
    },
    quantityAvailable: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

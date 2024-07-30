const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const actionSchema = new Schema({
    type: {
        type: String,
        enum: ['entry', 'exit'],
        default: 'entry'
    },
    date: {
        type: Date,
        default: Date.now
    },
    quantity: {
        type: Number,
        required: true
    },
    remaining: {
        type: Number,
        default: 0,
        required: true
    },

    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }
}, {
    timestamps: true
});

const Action = mongoose.model('Action', actionSchema);
module.exports = Action;

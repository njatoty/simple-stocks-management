const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true        
    },
}, {
    timestamps: true,
});

const Group = mongoose.model('ProductGroup', groupSchema);
module.exports = Group;
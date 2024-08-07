const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storySchema = new Schema({
    date: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        enum: [
            "C", "R", "U", "D", // like CRUD
            "g", // generate file
            "c", // cancel
        ],
        required: true
    },
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    },
    productAction: {
        type: mongoose.Types.ObjectId,
        ref: 'Action'
    },
    target: {
        type: String,
        enum: [
            "product",
            "entry",
            "exit"
        ]
    },
    count: {
        type: Number,
        default: 0
    },
    comment: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

storySchema.virtual('message').get(function() {

    const actionValues = {
        C: 'ajouté',
        R: 'visité',
        U: 'modifié',
        D: 'supprimé',
        c: 'annulé',
        g: 'généré un fichier'
    }

    const targetValues = {
        product: "produits",
        entry: "entrées",
        exit: "sorties"
    }

    const countValues = (count) => {
        count = Math.abs(count);
        return count === 0 ? '' : count
    } 

    if (this.populate('user') && this.user.name) {
        let action = actionValues[this.action];
        
        if (this.action === 'g') {
            return `${this.user.name} a ${action} un fichier`;
        }
        
        if (this.action === 'c') {

            let target = targetValues[this.target];
            let count = countValues(this.count);

            if (this.populate('productAction') && this.action.date) {
                let date = this.productAction.date.toLocalDateString('fr');
                return `${this.user.name} a ${action} ${count} ${target} le ${date}`;
            }

            return `${this.user.name} a ${action} ${count} ${target}`;

        } else if (this.action === 'U') {

            let target = targetValues[this.target];
            let count = countValues(this.count);
            return `${this.user.name} a ${action} une ${target} en changeant la quantité en ${count}`;

        } else {

            let target = targetValues[this.target];
            let count = countValues(this.count);
            return `${this.user.name} a ${action} ${count} ${target}`;

        }
    }

    return '-'
});


// add positive number in count
storySchema.pre('save', function(next) {
    if (this.count) {
        this.count = Math.abs(this.count);
    }
    next();
});

const Story = mongoose.model('Story', storySchema);
module.exports = Story;

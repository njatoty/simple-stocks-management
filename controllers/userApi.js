const User = require("../models/UserModel");

async function createNewUser(req, res) {
    try {
        const user = await User.create({
            ...req.body
        });
        
        res.json({
            ok: true,
            data: user
        })
    } catch (error) {
        const { email } = error.keyValue;
        if (error.code === 11000) {
            
            return res.json({
                ok: false,
                message: "Duplacation error: " + email
            })
        }
        res.json({
            ok: false,
            message: 'Error'
        })
    }

}


module.exports = { createNewUser }
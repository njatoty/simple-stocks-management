const Story = require("../models/StoryModel");

async function getStories(req, res) {
    try {
        const users = await Story.find()
        .populate('user')
        .populate('product')
        .populate('productAction')
        .sort({
            date: 'desc'
        });
        
        res.json({
            ok: true,
            data: users
        })
    } catch (error) {
        res.json({
            ok: false,
            message: 'Error'
        })
    }

}


module.exports = { getStories }
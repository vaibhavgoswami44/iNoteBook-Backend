const express = require('express')
const featchuser = require('../middleware/featchuser')
const Notes = require('../models/Notes')
const router = express.Router()
const { body, validationResult } = require('express-validator');


//Route : 1 Get All Notes path : '/api/notes/getallnotes'  Login Require
router.get('/getallnotes', featchuser, async (req, res) => {
    try {
        const user_id = req.user.id
        const note = await Notes.find({ user: user_id })

        const notes = note.map(obj => {
            const { __v, date, user, ...rest } = obj._doc;
            return rest;
        });

        res.send(notes)
    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: 'Internal Server Error' })
    }
}
)

//Route : 2  Add Note path : '/api/notes/addnote'  Login Require
router.post('/addnote', featchuser,
    [
        body('title', "title length must be 3").isLength({ min: 3 }),
        body('tag', "tag length must be 3").isLength({ min: 3 }),
        body('description', "description length must be 5").isLength({ min: 5 })
    ],
    async (req, res) => {

        //for Validations
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            const errorMsgs = errors.array().map(error => error.msg);
            return res.status(400).json({ status: "Failed", msg: errorMsgs });
        }

        try {
            const { title, tag, description } = req.body
            const user_id = req.user.id
            const note = new Notes({ title, tag, description, user: user_id })
            const newNote = await note.save()

            const createnote = newNote.map(obj => {
                const { __v, date, user, ...rest } = obj._doc;
                return rest;
            }); 
            res.json({ status: "success", msg: "Note Added", createnote })

        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: 'Internal Server Error' })
        }
    }
)

//Route : 3  Update Note path : '/api/notes/updatenote/:id'  Login Require
router.put('/updatenote/:id', featchuser,
    [
        body('title', "title length must be 3").isLength({ min: 3 }),
        body('tag', "   tag length must be 3").isLength({ min: 3 }),
        body('description', "    description length must be 5").isLength({ min: 5 })
    ],
    async (req, res) => {

        //for Validations
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const errorMsg = errors.array().map(error => error.msg);
            return res.status(400).json({ status: "Failed", msg: errorMsg });
        }

        try {
            const { title, tag, description } = req.body
            let newNote = {}
            if (title) { newNote.title = title }
            if (tag) { newNote.tag = tag }
            if (description) { newNote.description = description }

            //Find Note
            let note = await Notes.findById(req.params.id)
            //if Note Not Found
            if (!note) { return res.status(404).json({ status: "Failed", msg: "Note Not Found" }) }

            //If user Trying To update another user Note
            if (note.user.toString() !== req.user.id) { return res.status(401).json({ status: "Failed", msg: "Not Allowed" }) }

            //Updating The Note
            note = await Notes.findByIdAndUpdate(req.params.id, { $set: newNote }, { new: true })

            res.json({ status: "success", msg: "Note Updated" })

        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: 'Internal Server Error' })
        }
    }
)

//Route : 4  Delete Note path : '/api/notes/deletenote/:id'  Login Require
router.delete('/updatenote/:id', featchuser, async (req, res) => {

    try {
        //Find Note
        let note = await Notes.findById(req.params.id)
        //if Note Not Found
        if (!note) { return res.status(404).json({ status: "Failed", msg: "Note Not Found" }) }

        //If user Trying To delete another user Note
        if (note.user.toString() !== req.user.id) { return res.status(401).json({ status: "Failed", msg: "Not Allowed" }) }

        //Deleting The Note
        note = await Notes.findByIdAndDelete(req.params.id)
        res.json({ status: "success", msg: "Note Deleted" })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: 'Internal Server Error' })
    }
}
)

module.exports = router


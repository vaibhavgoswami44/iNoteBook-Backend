const express = require('express')
const fs = require('fs')
const multer = require('multer');
const router = express.Router()
const { body, validationResult } = require('express-validator');
const User = require("../models/User")
const Notes = require('../models/Notes')
const OTP = require('../models/OTP')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const featchuser = require('../middleware/featchuser');
const path = require('path');
const nodemailer = require('nodemailer');

const jwt_secret = process.env.JWT_SECRET



// Set up storage for multer
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const imagePath = path.join(__dirname, '..', 'public', 'images', 'profile_pictures');
        cb(null, imagePath);//Profile Images Folder
    },
    filename: async function (req, file, cb) {
        const userId = req.user.id;
        let user = await User.findById(userId)
        const imageName = `${user._id}_ProfileImage.png`
        cb(null, imageName)//user profile Image Name
    }
});

// Set up multer middleware
const upload = multer({ storage: storage });




//Route : 1 Create User In Datebase path : '/api/auth/createuser' No Login Require
router.post('/createuser',
    [
        body('email', "Invalid Email").isEmail(),
        body('password', "password length must be 5").isLength({ min: 5 }),
        body('name', "Invalid Name").isLength({ min: 3 })
    ],
    async (req, res) => {
        try {
            const { theme } = req.body
            //for Validations
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                const errorMsgs = errors.array().map(error => error.msg);
                return res.status(400).json({ status: "Failed", msg: errorMsgs });
            }

            //if email already exits
            let user = await User.findOne({ email: req.body.email })
            if (user) {
                return res.status(400).json({ status: 'Failed', msg: ["Email already Exists"] })
            }

            //Hashing The Password
            const myPlaintextPassword = req.body.password
            const salt = await bcrypt.genSalt(10)
            const hashPassword = await bcrypt.hash(myPlaintextPassword, salt);

            //create user in database
            user = await User.create({
                name: req.body.name,
                theme,
                email: req.body.email,
                password: hashPassword,
                //Default Image
                profilePicture: 'images/profile_pictures/default.png'
            })

            //Generating JWT Token
            const data = {
                user: {
                    id: user.id
                }
            }
            const jwt_token = jwt.sign(data, jwt_secret)

            // check if user has a profile picture
            let profilePicture = `${req.protocol}://${req.get('host')}/images/profile_pictures/default.png`

            //Sending The JWT Token
            res.status(200).json({ authToken: jwt_token, status: 'success', msg: ['Welcome to iNoteBook'], profilePicture, name: user.name, theme: user.theme })

        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    },
);



//Route : 2 Authenticate a user path: '/api/auth/login'  No Login Require
router.post('/login',
    async (req, res) => {
        try {
            const { email, password } = req.body
            //Check User Exists or Not
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ status: 'Failed', msg: ['Please Login With Correct Credentials '] })
            }

            //Checking The Password
            const comparePassword = await bcrypt.compare(password, user.password)
            if (!comparePassword) {
                return res.status(400).json({ status: 'Failed', msg: ['Please Login With Correct Credentials '] })
            }

            //Generating JWT Token
            const data = {
                user: {
                    id: user.id
                }
            }
            const jwt_token = jwt.sign(data, jwt_secret)


            // profile picture
            let profilePicture = `${req.protocol}://${req.get('host')}/${user.profilePicture}`;

            //Sending The JWT Token
            res.status(200).json({ authToken: jwt_token, status: 'success', msg: ['Welcome to iNoteBook'], profilePicture, name: user.name, theme: user.theme })

        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    })



//Route : 3 Get Loggedin user detail path: '/api/auth/getuser'   Login Require
router.post('/getuser', featchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");

        // profile picture
        let profilePicture = `${req.protocol}://${req.get('host')}/${user.profilePicture}`;

        // remove fields that should not be sent to the client
        const { _id, password, __v, date, ...userData } = user.toObject();

        const responseData = { ...userData, profilePicture };
        res.send(responseData);
    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
    }
});


//Route 4 : Update User Details path: '/api/auth/updateUserDetails'  Login Require
router.put('/updateUserDetails', featchuser, upload.single('profilePicture'), async (req, res) => {
    try {
        const { birthDate, gender, name } = req.body

        const userId = req.user.id;
        let user = await User.findById(userId).select("-password");

        user = await User.findOneAndUpdate(userId, { $set: { name, gender, birthDate, profilePicture: `/images/profile_pictures/${user._id}_ProfileImage.png` } }, { returnOriginal: false })

        let profilePicture = `${req.protocol}://${req.get('host')}/${user.profilePicture}`;
        res.json({ status: 'success', msg: "Profile Updated Successfully", profilePicture, name });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
    }
});



//Route : 5 Authenticate a user for update email or password or delete account path: '/api/auth/authenticate'  Login Require
router.post('/authenticate', featchuser,
    async (req, res) => {
        try {
            const { password } = req.body

            const userId = req.user.id;
            let user = await User.findById(userId)

            //Checking The Password
            const comparePassword = await bcrypt.compare(password, user.password)
            if (!comparePassword) {
                return res.status(400).json({ status: 'Failed', msg: [' Wrong Password '] })
            }

            return res.status(200).json({ status: 'success' })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    })

//Route : 6  update email or password path: '/api/auth/updateEmailorPassword'  Login Require
router.put('/updateEmailorPassword', featchuser,
    async (req, res) => {
        try {
            const { email, password } = req.body
            const userId = req.user.id;
            let user = await User.findById(userId)


            if (email) {
                //Check If Email Already exits
                const user2 = await User.findOne({ email })
                if (user2) {
                    return res.status(400).json({ status: 'Failed', msg: ["Email already Exists"] })
                }
                else {
                    user = await User.findOneAndUpdate(userId, { $set: { email } }, { returnOriginal: false })
                    return res.status(200).json({ status: 'success', msg: ['Email Updated Successfully'] })
                }
            }

            if (password) {
                //Hashing The Password
                const myPlaintextPassword = password
                const salt = await bcrypt.genSalt(10)
                const hashPassword = await bcrypt.hash(myPlaintextPassword, salt);
                user = await User.findOneAndUpdate(userId, { $set: { password: hashPassword, lastPasswordChangedDate: Date.now() } }, { returnOriginal: false })
                return res.status(200).json({ status: 'success', msg: ['Password Updated Successfully'] })
            }
        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    })

//Route : 7  Delete user path : '/api/auth/deleteUser'  Login Require
router.delete('/deleteUser', featchuser, async (req, res) => {

    try {
        //Find user
        const userId = req.user.id;
        let user = await User.findById(userId)

        //if user Not Found
        if (!user) { return res.status(404).json({ status: "Failed", msg: ["User Not Found"] }) }

        //delete user all notes
        const notes = await Notes.deleteMany({ user: userId })

        //Deleting User
        user = await User.findByIdAndDelete(userId)
        res.json({ status: "success", msg: ["User Deleted"] })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
    }
}
)

//Route : 8 // route to generate and send OTP  path : '/api/auth/forgot-password'  Login Require
router.post('/forgot-password',
    async (req, res) => {

        const email = req.body.email;
        let user = await User.findOne({ email })

        //if user Not Found
        if (!user) { return res.status(404).json({ status: "Failed", msg: ["User Not Found"] }) }

        // generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // create a Nodemailer transporter object
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        // configure the email message
        const mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `Your OTP is ${otp}.`
        };

        try {
            // send the email
            await transporter.sendMail(mailOptions);

            // store the OTP and user id in the database
            let otpDB = await OTP.findOne({ email })
            if (otpDB) {
                otpDB = await OTP.findByIdAndDelete(otpDB._id)
            }
            otpDB = await OTP.create({
                email,
                otp,
                otpValidation: false
            })

            res.json({ status: "success", msg: ["OTP has been sent to your email"] });
        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    });

//Route : 9 route to verify the OTP and allow the user to reset their password path : '/api/auth/verify-otp'  Login Require
router.post('/verify-otp',
    async (req, res) => {

        //user
        const { otp, email } = req.body
        let user = await User.findOne({ email })
        let otpDB = await OTP.findOne({ email })


        //if user Not Found
        if (!user) { return res.status(404).json({ status: "Failed", msg: ["User Not Found"] }) }
        if (!otpDB) { { return res.status(200).json({ status: 'Failed', msg: ['Session Expired'] }) } }

        try {
            //check otp and user id
            if (parseInt(otp) === otpDB.otp && email === otpDB.email) {
                otpDB = await OTP.findByIdAndDelete(otpDB._id)
                otpDB = await OTP.create({
                    email,
                    otp: 0,
                    otpValidation: true
                })
                // OTP is correct, allow user to reset password
                res.json({ status: 'success', msg: ["Enter Your New Password"] });
            } else {
                // OTP is incorrect, show error message
                res.json({ status: 'Failed', msg: ['Invalid OTP.'] });
            }
        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    });

//Route : 10 route to reset password path : '/api/auth/reset-password'  Login Require
router.post('/reset-password',
    async (req, res) => {

        //Find user
        const { password, email } = req.body
        let user = await User.findOne({ email })
        let otpDB = await OTP.findOne({ email })

        //if user Not Found
        if (!user) { return res.status(404).json({ status: "Failed", msg: ["User Not Found"] }) }
        if (!otpDB) { { return res.status(200).json({ status: 'Failed', msg: ['Session Expired'] }) } }

        try {
            //check otp and user id
            if (otpDB.otpValidation && user.email === otpDB.email) {

                //Hashing The Password
                const myPlaintextPassword = password
                const salt = await bcrypt.genSalt(10)
                const hashPassword = await bcrypt.hash(myPlaintextPassword, salt);
                user = await User.findOneAndUpdate(user._id, { $set: { password: hashPassword, lastPasswordChangedDate: Date.now() } }, { returnOriginal: false })
                return res.status(200).json({ status: 'success', msg: ['Password Updated Successfully'] })
            }

        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
        }
    });


//Route 11 : Update User theme path: '/api/auth/update-theme'  Login Require
router.put('/update-theme', featchuser, async (req, res) => {
    try {
        const { theme } = req.body
        const userId = req.user.id;
        let user = await User.findById(userId).select("-password");
        user = await User.findOneAndUpdate(userId, { $set: { theme } }, { returnOriginal: false })
        res.json({ status: 'success', msg: "Theme Updated Successfully", theme: user.theme });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
    }
});

module.exports = router;

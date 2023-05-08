const jwt = require('jsonwebtoken');

const jwt_secret = "VAIBHAViNoteBookAPP"

const featchuser = (req, res, next) => {

    //Get The user from JWT token and add id to req object
    const jwt_token = req.header('auth-token')
    if (!jwt_token) {
        return res.status(401).json({ status: 'Failed', msg: ['Invalid Token'] })
    }

    try {
        const data = jwt.verify(jwt_token, jwt_secret)
        req.user = data.user
        next()

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ status: 'Failed', msg: ['Internal Server Error'] })
    }

}

module.exports = featchuser
const mongoose = require('mongoose')
const chalk = require('chalk')
require('dotenv').config()

const uri = process.env.URI
const connectToMongo = () => {
    mongoose.connect(uri).then(
        console.log(chalk.bold.green('\nConnected To Database'))
    ).catch((err) => console.log(err))
}
module.exports = connectToMongo;
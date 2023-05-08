const mongoose = require('mongoose')
const chalk = require('chalk')

const uri = "mongodb://127.0.0.1:27017/iNoteBook"

const connectToMongo = () => {
    mongoose.connect(uri).then(
        console.log(chalk.bold.green('\nConnected To Database'))
    )
}
module.exports = connectToMongo;
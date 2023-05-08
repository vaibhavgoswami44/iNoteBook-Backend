const express = require("express")
const connectToMongo = require("./db")
const os = require('os');
const chalk = require('chalk');
const app = express()
const port = 8080


//Creating LAN
try {
    const networkInterfaces = os.networkInterfaces();
    const interfaceName = 'Wi-Fi'; // Change to match your network interface name
    const interfaceInfo = networkInterfaces[interfaceName].find(info => {
        return info.family === 'IPv4' && !info.internal;
    });
    var localIpv4 = interfaceInfo.address
} catch (error) {
    localIpv4 = null
}

//connecting to db
connectToMongo()


app.use(express.json())
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', '*')
    res.header('Access-Control-Allow-Headers', '*')
    next()
})


//Path 
app.use(express.static('public'))
app.use("/api/auth", require('./routes/auth'))
app.use("/api/notes", require('./routes/notes'))

app.get('/', (req, res) => {
    res.send("hello")
})

app.listen(port, [localIpv4, 'localhost'], () => {
    console.log('Server listening on\n')
    console.log(chalk.bold.white('\tLocal') + `:           http://localhost:` + chalk.bold.white(port))
    console.log(chalk.bold.white('\tOn Your Network') + `: http://${localIpv4}:` + chalk.bold.white(port) + '\n\n')
})
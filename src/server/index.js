const express = require('express')
const helmet = require('helmet')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const path = require('path')
const compression = require('compression')
const mongoose = require('mongoose')
const chalk = require('chalk')
const fs = require('fs')
const fileUpload = require('express-fileupload')
const io = require('socket.io')();
const priceData = require('./utils/data')

const config = require('./config')

const apiRoutes = require('./routes/api')
const appRoutes = require('./routes/app')

mongoose.connect(
    config.MONGODB_URI, {
        useNewUrlParser: true
    }
)

const server = express()

server.use(helmet())
server.use(morgan('dev'))
server.use(compression())
server.use(fileUpload())
server.use(bodyParser.json())

if (!config.IS_PRODUCTION) {
    server.use(express.static(path.join(__dirname, '../../dist')))
}

server.use(express.static(path.join(__dirname, 'public')))
server.use('/api', apiRoutes)
server.use(appRoutes)

io.on('connection', (client) => {
    client.on('subscribeToTimer', (interval) => {
        console.log('client is subscribing to timer with interval ', interval);
        setInterval(() => {
            client.emit('timer', new Date());
        }, interval);
    });
    client.on('sendData', (interval) => {
        console.log('client is subscribing to sendData with interval ', interval);
        setInterval(() => {
            console.log('index.js', priceData.data)
            client.emit('priceData', priceData)
        }, interval);
    });
});


io.listen(config.SOCKETSIO_PORT);
console.log('listening on port ', config.SOCKETSIO_PORT);

mongoose.connection.on('connected', () => {
    console.log(chalk.blue.bold('Connected to Mongo!'))

    // this is sometimes necessary to prevent mongoose errors
    const dir = fs.readdirSync(path.join(__dirname, './models'))
    dir.forEach(model => require(`./models/${model}`))

    server.listen(config.PORT, () => {
        console.log(chalk.blue.bold('Server is up and running: http://localhost:' + config.PORT))
    })
})
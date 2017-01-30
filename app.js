var express = require('express'),
    favicon = require('serve-favicon'),
    routes = require('./routes'),
    path = require('path'),
    config = require('./config'),
    morgan = require('morgan'),
    gpio = require('onoff').Gpio,
    methodOverride = require('method-override'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    pg = require('pg'),
    nodemailer = require('nodemailer'),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    logger = require('winston');

// persistant variables
var gpio_state = new Array();
var door_status = 'Unknown';

// set logger level to debug
logger.level = 'debug';

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);

// extra error handling for development
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

server.listen(app.get('port'), function() {
    logger.info("Listening on port " + app.get('port'));
});

// config up down monitor pins to report door status
garage_down = new gpio(config.GARAGE_DOWN, 'in', 'both');
garage_up = new gpio(config.GARAGE_UP, 'in', 'both');
garage_move = new gpio(config.GARAGE_PIN, 'out');

garage_down.watch(function(err, value) {
    handleGpioChange(config.GARAGE_DOWN, value, door_state_check);
});

garage_up.watch(function(err, value) {
    handleGpioChange(config.GARAGE_UP, value, door_state_check);
});

// move garage door, optional callback
function moveGarageDoor(callback) {
    //from https://github.com/scoobyshi/garagejs/blob/master/garage.js
    logger.debug("Moving garage door");

    // after config.RELAY_TIMEOUT turn relay off
    setTimeout(function () {
        garage_move.write(config.RELAY_OFF);
    }, config.RELAY_TIMEOUT);
    // below will be called first and then above will trigger later
    garage_move.write(config.RELAY_ON);

    if (callback) {
        callback();
    }
}

// determine current state of door
//gpio.on('change', function(channel, value) {
function door_state_check() {
    var old_door_status = door_status;

    logger.debug("update door state");
    /* states: [GARAGE_UP, GARAGE_DOWN]
     * garage up [true, false],
     * garage down [false, true],
     * garage between [false, false]
     * unknown [unknown, unknown]
     */

    gpio_up_state = gpio_state[config.GARAGE_UP]
    gpio_down_state = gpio_state[config.GARAGE_DOWN]
    
    if (gpio_up_state == true && gpio_down_state == false)
        door_status = 'UP';
    if (gpio_up_state == false && gpio_down_state == true)
        door_status = 'DOWN';
    if (gpio_up_state == false && gpio_down_state == false)
        door_status = 'BTWN';

    if (old_door_status != door_status) {
        logger.info("new door status: " + door_status
                    + " Old: " + old_door_status);
        io.sockets.emit('ginfo', door_status);
        io.sockets.emit('log', door_status);
        log_action_to_db(door_status);
        send_email_notify(door_status);
    }
}

io.sockets.on('connection', function (socket) {
    var connectAddr = socket.request.connection;
    logger.info("New connection from " + connectAddr.remoteAddress + ":" + connectAddr.remotePort);

    // connected
    socket.emit('cok', 'Connected');

    // client requesting door status
    socket.on('dstatus', function (data) {
        logger.debug('Status requested: ' + data);
        door_state_check();
        socket.emit('ginfo', door_status);
    });

    // garage move
    socket.on('move', function (data) {
        logger.info('Requesting garage movement, data: ' + data);
        moveGarageDoor();
        socket.emit('log', 'Garage moved');
    });
});

// updates GPIO state table
function handleGpioChange(pin, value, callback) {
    logger.debug("GPIO pin " + pin + " value update = " + value);
    // TODO should we check current value first?
    gpio_state[pin] = value;
    callback();
}

// reads the state of the door instead of waiting for polling
function readDoorState() {
    garage_down.read(function(err, value) {
        handleGpioChange(config.GARAGE_DOWN, value, door_state_check);
    });
    garage_up.read(function(err, value) {
        handleGpioChange(config.GARAGE_UP, value, door_state_check);
    });
}

function log_action_to_db(action) {
    pg.connect(config.DB_CONNECT_STRING, function(err, client, done) {
        if(err) {
            return console.error('error fetching pg client from pool', err);
        }
        client.query("INSERT INTO " + config.DB_LOG_TABLE + " (action) VALUES ($1)", [action], function(err) {
            if (err) {
                return console.error('error running query', err);
            }
            client.end();
        });
    });
}

function send_email_notify(msg) {
    var transporter = nodemailer.createTransport({
        host: config.SMTP_SERVER,
        tls: {
            // need to use this setting with self-signed certs
            rejectUnauthorized: false 
        }
    });
    var mailOptions = {
        from: config.notify_from,
        to: config.notify_to,
        subject: "Garage Notification: " + msg,
        text: "Notification of garage action: " + msg
    }
    transporter.sendMail(mailOptions, function(error, info){
        if(error) {
            logger.error(error);
        } else {
            logger.info("Email notification sent: " + info.response);
        }
        transporter.close();
    });
}

// initial run of readdoorstate to update values in beginning, run only once
// immediate function
(function initDoorCheck() {
    readDoorState();
}());

process.on('SIGINT', function() {
    logger.info('Got SIGINT');
    garage_move.unexport();
    garage_down.unexport();
    garage_up.unexport();
    logger.info('All pins unexported');
    process.exit(1);
})

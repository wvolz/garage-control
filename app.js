var express = require('express'),
    favicon = require('serve-favicon'),
    routes = require('./routes'),
    path = require('path'),
    config = require('./config'),
    async = require('async'),
    gpio = require('rpi-gpio'),
    morgan = require('morgan'),
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

function delayPinWrite(pin, value, callback) {
    setTimeout(function() {
        gpio.write(pin, value, callback);
    }, config.RELAY_TIMEOUT);
}

// config up down monitor pins to report door status
gpio.setup(config.GARAGE_DOWN, gpio.DIR_IN);
gpio.setup(config.GARAGE_UP, gpio.DIR_IN);
gpio.setup(config.GARAGE_PIN, gpio.DIR_OUT);

// code below to listen for changes to gpio
gpio.on('change', function(channel, value) {
    //console.log("GPIO STATUS C: " + channel + " V: " + value);
    var old_door_status = door_status;

    if (channel == config.GARAGE_DOWN
        || channel == config.GARAGE_UP) {
        //console.log("gpio MATCH up/down pins");

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
    }

    if (old_door_status != door_status) {
        logger.info("new door status: " + door_status
                    + " Old: " + old_door_status);
        io.sockets.emit('ginfo', door_status);
        io.sockets.emit('log', door_status);
        log_action_to_db(door_status);
        send_email_notify(door_status);
    }
});

io.sockets.on('connection', function (socket) {
    var connectAddr = socket.request.connection;
    logger.info("New connection from " + connectAddr.remoteAddress + ":" + connectAddr.remotePort);

    // connected
    socket.emit('cok', 'Connected');

    // client requesting door status
    socket.on('dstatus', function (data) {
        logger.debug('Status requested: ' + data);
        socket.emit('ginfo', door_status);
    });

    // garage move
    socket.on('move', function (data) {

        async.series([
            function(callback) {
                gpio.write(config.GARAGE_PIN, config.RELAY_ON, function(err) {
                    if (err) throw err;
                });
                callback();
            },
            function(callback) {
                delayPinWrite(config.GARAGE_PIN, config.RELAY_OFF, callback); 
            }
        ]);

        logger.info('Requesting garage movement, data: ' + data);
        socket.emit('log', 'Garage moved');
    });
});

function gpio_read_state_pin(pin, emit_change) {
    //console.trace("gpio read");
    // default value for emit_change = true
    emit_change = emit_change || true;
    gpio.read(pin, function(err, value) {
        if (err){
            console.log("ERROR: gpio_read_state_pin pin[" + pin + "] " + err);
        } else {
            cur_state = gpio_state[pin];
            if(cur_state !== value) {
                console.log("p: " + pin + "c: " + cur_state + "v: " + value);
                var prev_state = cur_state;
                gpio_state[pin] = value;
                //console.log("gpio_state[ "+pin+" ] = "+value);
                if (emit_change) {
                    gpio.emit('change', pin, value);
                }
            }
        }
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

function check_gpio_state() {
    //console.log('check gpio state');
    gpio_read_state_pin(config.GARAGE_DOWN);
    gpio_read_state_pin(config.GARAGE_UP);
}

//check GPIO state every 200ms
setInterval(check_gpio_state, 200);

process.on('SIGINT', function() {
    gpio.destroy(function() {
        console.log('All pins unexported');
    });
    process.exit(1);
})

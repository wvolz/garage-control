var express = require('express'),
    routes = require('./routes'),
    path = require('path'),
    config = require('./config'),
    async = require('async'),
    gpio = require('rpi-gpio'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

// persistant variables
var gpio_state = new Array();
var status = 'BTWN';

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

server.listen(app.get('port'))
console.log("Listening on port " + app.get('port'));

app.get('/', routes.index);

function delayPinWrite(pin, value, callback) {
    setTimeout(function() {
        gpio.write(pin, value, callback);
    }, config.RELAY_TIMEOUT);
}

// code below to listen for changes to gpio
gpio.on('change', function(channel, value) {
    //console.log("GPIO STATUS C: " + channel + " V: " + value);
    if (channel == config.GARAGE_DOWN) {
        if (gpio_state[config.GARAGE_UP] == false) {
            if (value == true) status = 'DOWN';
            if (value == false) status = 'BTWN';
            io.sockets.emit('ginfo', status);
            io.sockets.emit('log', status);
            //console.log("GARAGE_GPIO " + status);
        }
    }
    if (channel == config.GARAGE_UP) {
        if (gpio_state[config.GARAGE_DOWN] == false) {
            if (value == true) status = 'UP';
            if (value == false) status = 'BTWN';
            io.sockets.emit('ginfo', status);
            io.sockets.emit('log', status);
            //console.log("GARAGE_GPIO " + status);
        }
    }
    console.log("GPIO Change, new status: " + status);
});

// config up down monitor pins to report status
gpio.setup(config.GARAGE_DOWN, gpio.DIR_IN);
gpio.setup(config.GARAGE_UP, gpio.DIR_IN);
gpio.setup(config.GARAGE_PIN, gpio.DIR_OUT);

io.sockets.on('connection', function (socket) {
    var connectAddr = socket.handshake.address;
    console.log("New connection from " + connectAddr.address + ":" + connectAddr.port);

    // connected
    socket.emit('cok', 'Connected');

    // client requesting status
    socket.on('status', function (data) {
        console.log('Status requested: ' + data);
        socket.emit('ginfo', status);
    });

    // garage move
    socket.on('move', function (data) {
        console.log('Requesting garage movement, data: ' + data);

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

        socket.emit('log', 'Garage moved');
    });
});

function gpio_read_state_pin(pin) {
    gpio.read(pin, function(err, value) {
        if (err){
            console.log("ERR: " + err);
        } else {
            cur_state = gpio_state[pin];
            if(cur_state !== value) {
                console.log("p: " + pin + "c: " + cur_state + "v: " + value);
                var prev_state = cur_state;
                gpio_state[pin] = value;
                gpio.emit('change', pin, value);
            }
        }
    });
}

setInterval(function(){
    gpio_read_state_pin(config.GARAGE_DOWN);
    gpio_read_state_pin(config.GARAGE_UP);
}, 200); // check state every 200ms

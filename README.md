# Garage

Node.js app to control a garage door opener via a Raspberry Pi. This is based heavily off of [Garage Node](https://github.com/brentnycum/garage-node).

It has the following additional features:

 * Realtime state monitoring
 * Email notifications of state change
 * State changes are logged to a database

## Requirements

[node.js](http://nodejs.org/)

``` shell
[sudo] apt-get install nodejs npm
```

Something to run the process (forever?)

## Installation

After checking out this code from Github, just run `npm install` from the app directory to install all dependencies.

## Dependencies Used

 * [Express](http://expressjs.com/)
 * Jade - For the one view template.
 * [async.js](https://github.com/caolan/async)
 * rpi-gpio
 * socket-io
 * database driver of your choice (tested with pg)
 * nodemailer
 * serve-favicon

## Configuration

Configuration is accomplished via a file called 'config.js'. Rename the file 'config.js.sample' to 'config.js' and edit
the following variables to get started:

 * `GARAGE_PIN` - Location of the gpio pin controlling the garage door. Using the pin map from the `pi-gpio` README.
 * `GARAGE_DOWN` - Pin connected to sensor indicating the garage is down.
 * `GARAGE_UP` - Pin connected to sensor indicating the garage is up. 
 * `RELAY_ON` - Relay on state.
 * `RELAY_OFF` - Relay off state.
 * `RELAY_TIMEOUT` - How long the relay should stay on before turning off.
 * `DB_CONNECT_STRING` - database connection string
 * `DB_LOG_TABLE` - table in the DB used to store door state changes
 * `notify_from` - who state change emails should come from (email address/name)
 * `notify_to` - who state change emails should be sent to

## Gotchas

My particular relay I used turns on when you fire low `0`, and off when firing high `1`. The app them use the `RELAY_TIMEOUT` to simulate a half second press, as if you pushed the wall switch.

The Raspberry Pi defaults the GPIO pin to low, but the pin is default set to input so it will not immediately fire on bootup. On first call the pin is opened for output and immediately low which turns on the relay since it's in the low state and making the set low call redundant but the relay is set high in the next call so it will need to be set low again on the next call.

## Parts

 * Raspberry Pi running Raspbian "wheezy"
 * Edimax EW-7811Un (WiFi dongle, b/g/n)
 * SainSmart 2-Channel Relay

## Links

 * [Hacking My Garage With A Raspberry Pi](http://itsbrent.net/2013/03/hacking-my-garage-with-a-raspberry-pi/)
 * [WiringPi](https://projects.drogon.net/raspberry-pi/wiringpi/)
 * [The GPIO Utility](https://projects.drogon.net/raspberry-pi/wiringpi/the-gpio-utility/)
 * [GPIO Pin Mapping](https://projects.drogon.net/raspberry-pi/wiringpi/pins/)
 * [Garage Node](https://github.com/brentnycum/garage-node)

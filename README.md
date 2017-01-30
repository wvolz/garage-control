# Garage

Node.js app to control a garage door opener via a Raspberry Pi. This is based heavily off of [Garage Node](https://github.com/brentnycum/garage-node).

It has the following additional features:

 * Realtime state monitoring
 * Email notifications of state change
 * State changes are logged to a database

## Requirements

 * [node.js](http://nodejs.org/) v4.4.x
 * systemd or forever to run the script long term (init/service scripts provided)
 * [Express](http://expressjs.com/)
 * [Pug](https://github.com/pugjs/pug) - For the one view template.
 * [onoff](https://github.com/fivdi/onoff) - GPIO access
 * socket-io
 * database driver of your choice (tested with pg)
 * nodemailer
 * winston

## Installation

1. Checkout code from github into a local directory
2. Install nodejs:
   On Debian based systems you can run the following to install node: `[sudo] apt-get install nodejs npm`
3. Install node dependencies: `npm install`
4. Copy init or systemd service script to the correct place
5. Copy config.js.sample to config.js and change for your hardware
6. Start process: `service garage-control start`
7. Check process is running: `service garage-control status`

## Configuration

Configuration is accomplished via a file called 'config.js'. Rename the file 'config.js.sample' to 'config.js' and edit
the following variables to get started:

 * `GARAGE_PIN` - GPIO # controlling the relay connected to the garage opener.
 * `GARAGE_DOWN` - GPIO # connected to sensor indicating the garage is down.
 * `GARAGE_UP` - GPIO # connected to sensor indicating the garage is up. 
 * `RELAY_ON` - Relay on state.
 * `RELAY_OFF` - Relay off state.
 * `RELAY_TIMEOUT` - How long the relay should stay on before turning off.
 * `DB_CONNECT_STRING` - database connection string
 * `DB_LOG_TABLE` - table in the DB used to store door state changes
 * `SMTP_SERVER` - smtp server to use for emails
 * `notify_from` - who state change emails should come from (email address/name)
 * `notify_to` - who state change emails should be sent to

## Parts

 * Raspberry Pi B v2 (or something more current)
 * 4-8 GB SDcard with Raspbian "jessie"
 * Edimax EW-7811Un (WiFi dongle, b/g/n)
 * SainSmart 2-Channel Relay
 * [Seco-Larm SM-217Q](http://www.smarthome.com/seco-larm-enforcer-sm-217q-w-miniature-surface-mount-contact-magnet.html)
 * Cat 5 cable for wiring (It's what I had on hand)
 * Power supply for the Pi

## Links

 * [Hacking My Garage With A Raspberry Pi](http://itsbrent.net/2013/03/hacking-my-garage-with-a-raspberry-pi/)
 * [WiringPi](https://projects.drogon.net/raspberry-pi/wiringpi/)
 * [The GPIO Utility](https://projects.drogon.net/raspberry-pi/wiringpi/the-gpio-utility/)
 * [GPIO Pin Mapping](https://projects.drogon.net/raspberry-pi/wiringpi/pins/)
 * [Garage Node](https://github.com/brentnycum/garage-node)

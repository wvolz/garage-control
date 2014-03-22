var config = {};

// pin # not GPIO #
// gpio 17
config.GARAGE_PIN = 11;
// gpio 22
config.GARAGE_DOWN = 15;
// gpio 23
config.GARAGE_UP = 16;

config.RELAY_ON = 1;
config.RELAY_OFF = 0;
config.RELAY_TIMEOUT = 500;

module.exports = config;

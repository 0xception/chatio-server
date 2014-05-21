var winston = require('winston');

module.exports = function (config) {
    var logger = new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                handleExceptions: false 
            })
        ],
        levels: config.levels,
        colors: config.colors,
        exitOnError: true
    });

    logger.cli();
    return logger;
};


var winston = require('winston');
var _ = require('lodash');

module.exports = function (options) {
    options = options || {};
    _.defaults(options, {
        levels: {
            verbose: 0,
            info: 1,
            data: 2,
            warn: 3,
            debug: 4,
            error: 5,
        },
        colors: {
            verbose: 'cyan',
            info: 'green',
            data: 'grey',
            warn: 'yellow',
            debug: 'blue',
            error: 'red',
        }
    });

    var logger = new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                handleExceptions: false 
            })
        ],
        levels: options.levels,
        colors: options.colors,
        exitOnError: true
    });

    logger.cli();
    return logger;
};


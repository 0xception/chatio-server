/*
 * ChatIO Server Configuration
 */

module.exports = {
    port: 4000,
    env: 'development',
    debug: true,
    log: {
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
    }
};

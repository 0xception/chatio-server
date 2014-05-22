


# chatio-server

  Simple [node.js](http://nodejs.org) chat service using socket.io and redis datastore. Currently accepts client connections from [chatio-client](https://github.com/0xception/chatio-client).

## Requirements

  - [node.js](http://nodejs.org)
  - [redis](http://redis.io/)

## Installation

If you have a git or a github account:

    $ git clone https://github.com/0xception/chatio-server.git
    $ cd chatio-server
    $ npm install 
    
## Configuration

  Check out the settings in config/config.js.
    
## Usage
  
  Once chatio-server has been installed to a dir simply run the server using node app.js. If you'd like to daemonize the server into a nice little multi-process service try using pm2.
  
### PM2 Service
    
    $ npm install -g pm2 (optional, highly recommended)
    $ pm2 start -i max app.js (optional)

## Features

  - Multi user (what would a single user chat look like?)
  - Multiple chat rooms
  - Redis backend store for users and room (not presistant)
  - Clustering safe (pm2 for auto clustering) 
  - Whisper/private message support

## TODO

  - Binary wrapper using [commander.js](https://github.com/visionmedia/commander.js) for easier startup
  - Split apart socket.io transport layer and application layer
  - Implement amqp to communicate with applicaiton layer 
  - ~~Testing framework using [mocha](http://visionmedia.github.io/mocha/)~~

  



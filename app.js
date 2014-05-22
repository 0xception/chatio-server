
var express = require('express');
var http = require('http');
var util = require('util');
var _ = require('lodash');

var config = require('./config/config.js');

// Quick dirty global logger not ideal
global.logger = require('./lib/logger')(config.log);

var ChatIO = require('./lib/chatio.js');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(config.port, function() {
    logger.info("Listening on port %s", config.port);  
});

var RedisStore = require('socket.io/lib/stores/redis');
var redis = require('socket.io/node_modules/redis');
var pub = redis.createClient();
var sub = redis.createClient();
var store = redis.createClient();
var chatio = new ChatIO({store: store});

// Clears the database until we have data persistence setup on sockets
chatio.init();

// Sets redis datastore for cross process socket.io communication (sockets
// themselves are not shared
io.set('store', new RedisStore({
  redisPub: pub,
  redisSub: sub,
  redisClient: store
}));

io.on('connection', function(socket) {
    socket.emit('notice', { 
        message: "Welcome to ChatIO..."
    });

    socket.on('register', function register(data) {
        logger.debug("Registration request from %s", data.username);
        
        if (!data.username) {
            socket.emit('registered', {error: 'Not a valid name'});
            return;
        }

        chatio.userExists(data.username, function(err, exists) {
            if (!!err) throw err;

            if (exists) {
                socket.emit('registered', {error: 'User already registered'});
                return;
            }
            var user = { id: socket.id, username: data.username };
            chatio.addUser(user, function(err) {
                socket.username = data.username;
                socket.emit('registered', { username: socket.username });
            });
        });
    });

    socket.on('deregister', function() {
        logger.debug("Deregistration request from %s", socket.username);
        
        var username = socket.username;
        var room = socket.room;

        if (username) {
            if (room) {
                chatio.leaveRoom(username, room, function(err) {
                    if (!!err) throw err;
                    
                    delete socket.room;
                    socket.leave(room);
                    socket.emit('left', { username: username, room: room });
                    socket.broadcast.to(room).emit("notice",{
                        message: util.format('%s left room', username)
                    });
                });
            }
            chatio.delUser(username, function(err) {
                if (!!err) throw err;
                
                delete socket.username
                socket.emit('deregistered', { username: username });
            });
        }
        //chatio.delUser(socket.username, function(err) {
        //    delete socket.username
        //    socket.emit('deregistered', { username: username });
        //});
    });

    socket.on('users', function(data) {
        logger.debug("Users list requested");
        
        var handler = function(err, roaster) {
            if (!!err) throw err;
            socket.emit('users', { users: roaster });
        };

        if (data && data.room) {
            chatio.getRoaster(data.room, handler);
        } else {
            chatio.getUsers(handler);
        }
    });

    socket.on('rooms', function() {
        logger.debug("Rooms list requested");
        
        chatio.getRooms(function(err, rooms) {
            if (!!err) throw err;
            socket.emit('rooms', { rooms: rooms });
        });
    });
    
    socket.on('join', function(data) {
        logger.debug("Join room request");
        
        // Needs to be registered before joining a room
        if (!socket.username) {
            socket.emit('joined', {
                error: 'Not registered. Please register before joining'
            });
            return;
        }
    
        // Leave any other room first
        if (socket.room) {
            var room = socket.room;
            chatio.leaveRoom(socket.username, socket.room, function(err) {
                if (!!err) throw err;

                delete socket.room;
                socket.leave(room);
                socket.emit('left', { username: socket.username, room: room });
                socket.broadcast.to(room).emit("notice",{
                    message: util.format('%s left room', socket.username)
                });
            });
        }

        chatio.joinRoom(socket.username, data.room, function(err) {
            socket.room = data.room;
            socket.join(socket.room);

            chatio.getRoaster(socket.room, function(roaster) {
                socket.emit('joined', { room: socket.room, users: roaster });
            });
            socket.broadcast.to(socket.room).emit("notice",{
                message: util.format('%s joined room', socket.username)
            });
        });
    });

    socket.on('leave', function(data) {
        logger.debug("Leave room request");
        
        var room = socket.room;
        chatio.leaveRoom(socket.username, room, function(err) {
            if (!!err) throw err;

            delete socket.room;
            socket.leave(room);
            socket.emit('left', { username: socket.username, room: room });
            socket.broadcast.to(room).emit("notice",{
                message: util.format('%s left room', socket.username)
            });
        });
    });

    socket.on('message', function(data) {
        logger.debug("Message recieved");
        socket.broadcast.to(socket.room).emit("message", {
            username: socket.username,
            message: data.message
        });
    });

    socket.on('whisper', function(data) {
        logger.debug("Whisper recieved");
        if (!data && !data.username) {
            socket.emit('notice', {error: 'Not a valid name'});
            return;
        }
        chatio.getUser(data.username, function(err, user) {
            if (!!err) throw err;

            logger.info('User Details: ', { user: user});

            io.sockets.socket(user.id).emit('whisper', {
                username: socket.username,
                message: data.message
            });
        });
    });

    socket.on('disconnect', function() {
        if (socket.username) {
            if (socket.room) {
                chatio.leaveRoom(socket.username, socket.room, function(err) {
                    if (!!err) throw err;
                });
            }
            chatio.delUser(socket.username, function(err) {
                if (!!err) throw err;
            });
        }
    });
});

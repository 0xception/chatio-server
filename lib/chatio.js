var _ = require('lodash');
var async = require('async');
var logger = require('./logger')();

var InvalidUserError = function () {
    return new Error('Not a valid user');
};

var InvalidRoomError = function () {
    return new Error('Not a valid room');
};

var ChatIO = function ChatIO(options) {
    _.defaults(options, {
        store: null
    });

    this.store = options.store;
    return this;
};

ChatIO.prototype.init = function() {
    this.store.flushall();
};

// Adds user to the redis key:value store
ChatIO.prototype.addUser = function addUser(user, fn) {
    if (!user) {
        return fn(new InvalidUserError());   
    }
    _.defaults(user, { id: '', username: '', room: '' });
    
    if (!user.username) {
        return fn(new InvalidUserError());
    }

    // Add the user to the users set
    this.store.sadd('users', user.username);

    // Add a hash of user data for cross worker sharing
    this.store.hmset('users:'+ user.username, {
        'id': user.id, 
        'username': user.username, 
        'room': user.room
    });
    
    // TODO: check for success/failure cases
    return fn(null);
};

// Removes user to the redis key:value store
ChatIO.prototype.delUser = function delUser(username, fn) {
    if (!username) {
        return fn(new InvalidUserError());
    }
    
    var self = this;

    // get the hash of user data
    this.store.hgetall('users:'+ username, function(err, user) {
        if (!!err) return fn(err);
        if (!user) return fn(null);

        // remove user from users set
        self.store.srem('users', user.username);
        // remove user data
        self.store.del('users:'+ user.username);
        
        return fn(null);
    });
};

// Gets a single user from the redis key:value store
ChatIO.prototype.getUser = function getUser(username, fn) {
    if(!username) return fn(new InvalidUserError());

    this.store.hgetall('users:'+ username, function(err, user) {
        if (!!err) {
            console.log("Error: "+ err);
            return fn(err);
        }
        return fn(null, user);
    });
};

// Gets all users from the redis key:value store
ChatIO.prototype.getUsers = function getUsers(fn) {
    var self = this;
    
    this.store.smembers('users', function(err, members) {
        if (!!err) return fn(err);
        
        var roaster = {};
        async.each(members, function(member, callback) {
            self.store.hgetall('users:'+member, function(err, user) {
                roaster[user.username] = user;
                callback();
            });
        }, function (err) {
            if (!!err) return fn(err); 
            return fn(null, roaster);
        });
    });
};

// Checks if the user exists in the redis key:value store
ChatIO.prototype.userExists = function userExists(username, fn) {
    if (!username) return fn(new InvalidUserError());
    return this.store.exists('users:'+ username, fn);
};

// Gets all the rooms from the redis key:value store
ChatIO.prototype.getRooms = function getRooms(fn) {
    // get the rooms from the room set
    this.store.smembers('rooms', function(err, rooms) {
        if (!!err) return fn(err);
        return fn(null, rooms);
    });
};

// Gets all the users within a room from the redis key:value store
ChatIO.prototype.getRoaster = function getRoaster(room, fn) {
    if (!room) return fn(new InvalidRoomError());
    
    var self = this;

    this.store.smembers('rooms:'+room+':users', function(err, members) {
        if (!!err) return fn(err);
        
        var roaster = {};
        async.each(members, function(member, callback) {
            self.store.hgetall('users:'+member, function(err, user) {
                roaster[user.username] = user;
                callback();
            });
        }, function (err) {
            if (!!err) return fn(err); 
            return fn(null, roaster);
        });
    });
};

ChatIO.prototype.joinRoom = function joinRoom(username, room, fn) {
    if (!username) return fn(new InvalidUserError()); 
    if (!room) return fn(new InvalidRoomError());
    
    // Add the room to the room set (unique set) and ads the user to the
    // rooms users set 
    var self = this;
    
    this.userExists(username, function(err, found) {
        if (!!err) return fn(err);
        if (!found) return fn(new InvalidUserError());

        self.store.multi()
            .sadd('rooms', room)
            .sadd('rooms:'+ room +':users', username)
            .hset('users:'+ username, 'room', room)
            .exec(function(err) {
                if (!!err) return fn(err);
                return fn(null);
            });
    });
};

ChatIO.prototype.leaveRoom = function leaveRoom(username, room, fn) {
    if (!username) return fn(new InvalidUserError()); 
    if (!room) return fn(new InvalidRoomError());
    
    // remove the user from the room's user list
    // if the room is empty remove the room itself
    var self = this;

    this.userExists(username, function(err, found) {
        if (!!err) return fn(err);
        if (!found) return fn(new InvalidUserError());
        
        self.store.multi()
            .srem('rooms:'+ room +':users', username)
            .hmset('users:'+ username, {room: ''})
            .scard('rooms:'+ room +':users')
            .exec(function(err, results) {
                if (!!err) return fn(err);
                
                var count = results[2];

                if (count === 0) {
                    self.store.srem('rooms', room);
                    self.store.del('rooms:'+ room +':users');
                }
                return fn(null);
            });
    });
};

module.exports = ChatIO;

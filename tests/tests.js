var config = require('../config/config.js');
var logger = require('../lib/logger')(config.log);

var assert = require("assert");
var should = require("should");

var redis = require('socket.io/node_modules/redis');
var ChatIO = require('../lib/chatio');

describe('chatio', function() {
    var store = redis.createClient();
    var chatio = new ChatIO({store: store});
    chatio.init();

    var steve, joey = null;
    var firefly = 'firefly';
    var trek = 'trek';
    
    beforeEach(function(done) {
        steve = { 
            id: 'E8m4kBzOZo9h4AEZ4ST6',
            username: 'steve',
            room: ''
        };

        joey = {
            id: 'a3i4xBzwHo8h3hEJ4Kl8',
            username: 'joey',
            room: ''
        };

        store.flushall(function(err) {
            if (!!err) throw err;
            done();
        });
    });

    describe('#addUser', function() {
        it('should fail validation', function(done) {
            chatio.addUser(null, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.addUser({
                id: steve.id, username: '', room: ''
            }, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should create user', function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                store.exists('users:'+steve.username, function(err, found) {
                    found.should.be.ok;
                    done();
                });
            });
        });
    });

    describe('#delUser', function() {
        it('should fail validation', function(done) {
            chatio.delUser(null, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.delUser('', function(err) {
                should.exist(err);
                done();
            });
        });

        it('should delete non existant user', function(done) {
            chatio.delUser(joey.username, function(err, changed) {
                should.not.exist(err);
                store.exists('users:'+joey.username, function(err, found) {
                    found.should.not.be.ok;
                    done();
                });
            });
        });

        it('should delete user', function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);

                chatio.delUser('steve', function(err) {
                    should.not.exist(err);
                    store.exists('users:'+steve.username, function(err, found) {
                        found.should.not.be.ok;
                        done();
                    });
                });
            });
        });
    });
    
    describe('#getUser', function() {
        beforeEach(function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.getUser(null, function(err, user) {
                should.exist(err);
                //user.should.not.be.ok;
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.getUser('', function(err, user) {
                should.exist(err);
                //user.should.not.be.ok;
                done();
            });
        });

        it('should get user object', function(done) {
            chatio.getUser(steve.username, function(err, user) {
                should.not.exist(err);
                user.should.be.okay;
                user.should.have.property('username', steve.username);
                done();
            });
        });
    });
    
    describe('#userExists', function() {
        beforeEach(function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.userExists(null, function(err, user) {
                should.exist(err);
                done();
            });
        });

        it('should fail validation', function(done) {
            chatio.userExists('', function(err, user) {
                should.exist(err);
                done();
            });
        });
        
        it('should not find user', function(done) {
            chatio.userExists(joey.username, function(err, found) {
                should.not.exist(err);
                found.should.not.be.ok;
                done();
            });
        });

        it('should get user object', function(done) {
            chatio.userExists(steve.username, function(err, found) {
                should.not.exist(err);
                found.should.be.okay;
                done();
            });
        });
    });

    describe('#getUsers', function() {
        it('should get an empty list', function(done) {
            chatio.getUsers(function(err, users) {
                should.not.exist(err);
                users.should.be.empty;
                done();
            });
        });
        
        it('should get users object list', function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                
                chatio.getUsers(function(err, users) {
                    should.not.exist(err);
                    users.should.be.okay;
                    users.should.have.property(steve.username, steve);
                    done();
                });
            });
        });
    });

    describe('#joinRoom', function() {
        beforeEach(function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                done();
            });
        });

        it('should fail username validation', function(done) {
            chatio.joinRoom(null, firefly, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail username validation', function(done) {
            chatio.joinRoom('', firefly, function(err) {
                should.exist(err);
                done();
            });
        });
        
        it('should fail room validation', function(done) {
            chatio.joinRoom(steve.username, null, function(err) {
                should.exist(err);
                done();
            });
        });
        
        it('should fail room validation', function(done) {
            chatio.joinRoom(steve.username, '', function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail user lookup', function(done) {
            chatio.joinRoom(joey.username, firefly, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should create and join room', function(done) {
            chatio.joinRoom(steve.username, firefly, function(err) {
                should.not.exist(err);
                store.multi()
                    .sismember('rooms', firefly)
                    .sismember('rooms:'+firefly+':users', steve.username)
                    .hget('users:'+steve.username, 'room') 
                    .exec(function(err, results) {
                        should.not.exist(err);
                        results[0].should.be.ok;
                        results[1].should.be.ok;
                        results[2].should.equal(firefly);
                        done();
                    });
            });
        });

        it('should join the room', function(done) {
            chatio.addUser(joey, function(err) {
                should.not.exist(err);
                chatio.joinRoom(joey.username, firefly, function(err) {
                    should.not.exist(err);
                    chatio.joinRoom(steve.username, firefly, function(err) {
                        should.not.exist(err);
                        store.multi()
                            .sismember('rooms', firefly)
                            .sismember('rooms:'+firefly+':users', steve.username)
                            .hget('users:'+steve.username, 'room') 
                            .exec(function(err, results) {
                                should.not.exist(err);
                                results[0].should.be.ok;
                                results[1].should.be.ok;
                                results[2].should.equal(firefly);
                                done();
                            });
                    });
                });
            });
        });
    });

    describe('#leaveRoom', function() {
        beforeEach(function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);

                chatio.joinRoom(steve.username, firefly, function(err) {
                    should.not.exist(err);
                    done();
                });
            });
        });

        it('should fail username validation', function(done) {
            chatio.leaveRoom(null, firefly, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail username validation', function(done) {
            chatio.leaveRoom('', firefly, function(err) {
                should.exist(err);
                done();
            });
        });
        
        it('should fail room validation', function(done) {
            chatio.leaveRoom(steve.username, null, function(err) {
                should.exist(err);
                done();
            });
        });
        
        it('should fail room validation', function(done) {
            chatio.leaveRoom(steve.username, '', function(err) {
                should.exist(err);
                done();
            });
        });

        it('should fail user lookup', function(done) {
            chatio.leaveRoom(joey.username, firefly, function(err) {
                should.exist(err);
                done();
            });
        });

        it('should leave and remove room', function(done) {
            chatio.leaveRoom(steve.username, firefly, function(err) {
                should.not.exist(err);
                store.multi()
                    .sismember('rooms', firefly)
                    .sismember('rooms:'+firefly+':users', steve.username)
                    .hget('users:'+steve.username, 'room') 
                    .exec(function(err, results) {
                        should.not.exist(err);
                        results[0].should.not.be.ok;
                        results[1].should.not.be.ok;
                        results[2].should.be.empty;
                        done();
                    });
            });
        });

        it('should leave the room but not remove the room', function(done) {
            chatio.addUser(joey, function(err) {
                should.not.exist(err);
                chatio.joinRoom(joey.username, firefly, function(err) {
                    should.not.exist(err);
                    chatio.leaveRoom(steve.username, firefly, function(err) {
                        should.not.exist(err);
                        store.multi()
                            .sismember('rooms', firefly)
                            .sismember('rooms:'+firefly+':users', steve.username)
                            .hget('users:'+steve.username, 'room') 
                            .exec(function(err, results) {
                                should.not.exist(err);
                                results[0].should.be.ok;
                                results[1].should.not.be.ok;
                                results[2].should.be.empty;
                                done();
                            });
                    });
                });
            });
        });
    });

    describe('#getRooms', function() {
        it('should get an empty list', function(done) {
            chatio.getRooms(function(err, rooms) {
                should.not.exist(err);
                rooms.should.be.empty;
                done();
            });
        });
        
        it('should get rooms list', function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);

                chatio.joinRoom(steve.username, firefly, function(err) {
                    should.not.exist(err);
                    
                    chatio.getRooms(function(err, rooms) {
                        should.not.exist(err);
                        rooms.should.be.okay;
                        rooms.should.be.an.Array.and.containEql(firefly);
                        done();
                    });
                });
            });
        });
    });

    describe('#getRoaster', function() {
        it('should fail validation', function(done) {
            chatio.getRoaster(null, function(err, users) {
                should.exist(err);
                done();
            });
        });
        
        it('should fail validation', function(done) {
            chatio.getRoaster('', function(err, users) {
                should.exist(err);
                done();
            });
        });
        
        // not yet implemented
        it.skip('should fail room lookup', function(done) {
            chatio.getRoaster(trek, function(err, users) {
                should.exist(err);
                done();
            });
        });

        it('should return empty list', function(done) {
            chatio.getRoaster(firefly, function(err, users) {
                should.not.exist(err);
                users.should.be.Object.and.be.empty;
                done();
            });
        });

        it('should get rooms roaster list', function(done) {
            chatio.addUser(steve, function(err) {
                should.not.exist(err);
                
                chatio.joinRoom(steve.username, firefly, function(err) {
                    should.not.exist(err);
                    steve.room = firefly;
                    
                    chatio.getRoaster(firefly, function(err, users) {
                        should.not.exist(err);
                        users.should.be.an.Object
                            .and.have.property(steve.username, steve);
                        done();
                    });
                });
            });
        });
    });

});

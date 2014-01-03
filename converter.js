#!/usr/local/bin/node
var config = require('./config'),
    torrentDir = process.argv[2] || process.env.TR_TORRENT_DIR || config.inDir,
    net = require('net');

function startServer() {
    var server = net.createServer(function(socket) {
            socket.setEncoding('utf8');
            socket.on('data', function(data) {
                console.log('Received', data);
                convert.convert(data);
            });
        }).listen(config.port, function() {
            convert = require('./convert');
            convert.queue.drain = function() {
                server.close();
            };
            startClient();
        }),
        convert;
    server.unref();
    server.on('error', function() {
        startClient();
    });
}

function startClient() {
    var client;
    client = net.connect(config.port, function() {
        console.log('Sending', torrentDir);
        client.setEncoding('utf8');
        client.end(torrentDir);
    });
}

startServer();

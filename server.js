var net = require('net'),
    Promise = require('promise');

module.exports = function(getHandler, port) {
    return new Promise(function(resolve) {
        port = port || 22756;
        startServer();

        function startServer() {
            var server = net.createServer(function(socket) {
                    socket.setEncoding('utf8');
                    socket.on('data', function(data) {
                        console.log('Received', data);
                        handler(JSON.parse(data));
                    });
                })
                    .listen(port, function() {
                        handler = getHandler();
                        handler.drain = function() {
                            server.close();
                        };
                        resolve(startClient);
                    }),
                handler;
            //Let the program exit regardless of the server
            server.unref();
            //If we cannot start a server, its probably because one is already started...
            server.on('error', function() {
                resolve(startClient);
            });
        }

        function startClient(options) {
            var client;
            client = net.connect(port, function() {
                console.log('Sending', options);
                client.setEncoding('utf8');
                client.end(JSON.stringify(options));
            });
        }
    });
};

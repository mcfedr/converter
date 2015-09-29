var r = require('./runner'),
    decider = require('./decider'),
    winston = require('winston');

module.exports = function() {
    var runner = r();

    return function(options) {
        decider(options).then(function(options) {
            runner.push(options);
        }, function(err) {
            winston.info(err);
        });
    };
};

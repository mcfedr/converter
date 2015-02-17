var parser = require('parser-parser'),
    async = require('async'),
    fs = require('fs'),
    Promise = require('promise');

module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        async.auto({
            read: function (cb) {
                fs.readFile(options.input, 'utf8', cb);
            },
            convert: ['read', function (cb, results) {
                cb(null, parser.toWebVTT(parser.fromSrt(results.read)));
            }],
            write: ['convert', function (cb, results) {
                var output = (options.outputDir || path.dirname(options.input)) + '/' + path.basename(options.input, path.extname(options.input)) + '.vtt';
                fs.writeFile(output, results.convert, 'utf8', cb);
            }],
            rm: ['write', function (cb) {
                if (options.delete) {
                    fs.unlink(options.input, cb);
                }
                else {
                    cb();
                }
            }]
        }, function(err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};

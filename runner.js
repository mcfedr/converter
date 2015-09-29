var async = require('async'),
    fs = require('fs-extra'),
    winston = require('winston');

module.exports = function() {
    return async.queue(function (options, cb) {
        fs.exists(options.output, function(exists) {
            if (exists && !options.overwrite) {
                winston.info('Skipping existing file', options.output);
                cb();
            }
            else if (options.done) {
                winston.info('Nothing to do', options.output);
                winston.info('Complete', options.output);
                cb();
            }
            else if (options.copy) {
                if (options.delete) {
                    fs.rename(options.input, options.output, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        winston.info('Moved', options.output);
                        winston.info('Complete', options.output);
                        cb();
                    });
                }
                else {
                    winston.info('Copying', options.output);
                    fs.copy(options.input, options.output, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        winston.info('Copied', options.output);
                        winston.info('Complete', options.output);
                        cb();
                    });
                }
            }
            else {
                winston.info('Starting', options.output);
                options.ff
                    .on('start', function (commandLine) {
                        winston.info('Spawned ffmpeg with command: ' + commandLine);
                    })
                    .on('codecData', function (data) {
                        winston.info('Input is ' + data.audio + ' audio with ' + data.video + ' video in ' + data.format + ' length ' + data.duration);
                    })
                    .on('progress', function (progress) {
                        winston.info('Progress', progress.percent.toFixed(2) + '%', options.output);
                    })
                    .on('end', function () {
                        winston.info('Complete', options.output);
                        if (options.delete) {
                            fs.unlink(options.input, cb);
                        }
                        else {
                            cb();
                        }
                    })
                    .on('error', function (err) {
                        winston.error('Error', options.output, err);
                        cb(err);
                    })
                    .run();
            }
        });
    }, 1);
};

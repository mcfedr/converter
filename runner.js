var async = require('async'),
    fs = require('fs-extra');

module.exports = function() {
    return async.queue(function (options, cb) {
        fs.exists(options.output, function(exists) {
            if (exists && !options.overwrite) {
                console.log('Skipping existing file', options.output);
                cb();
            }
            else if (options.done) {
                console.log('Nothing to do', options.output);
                console.log('Complete', options.output);
                cb();
            }
            else if (options.copy) {
                if (options.delete) {
                    fs.rename(options.input, options.output, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        console.log('Moved', options.output);
                        console.log('Complete', options.output);
                        cb();
                    });
                }
                else {
                    console.log('Copying', options.output);
                    fs.copy(options.input, options.output, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        console.log('Copied', options.output);
                        console.log('Complete', options.output);
                        cb();
                    });
                }
            }
            else {
                console.log('Starting', options.output);
                options.ff
                    .on('start', function (commandLine) {
                        console.log('Spawned ffmpeg with command: ' + commandLine);
                    })
                    .on('codecData', function (data) {
                        console.log('Input is ' + data.audio + ' audio with ' + data.video + ' video in ' + data.format + ' length ' + data.duration);
                    })
                    .on('progress', function (progress) {
                        console.log('Progress', progress.percent.toFixed(2) + '%', options.output);
                    })
                    .on('end', function () {
                        console.log('Complete', options.output);
                        if (options.delete) {
                            fs.unlink(options.input, cb);
                        }
                        else {
                            cb();
                        }
                    })
                    .on('error', function (err) {
                        console.log('Error', options.output, err);
                        cb(err);
                    })
                    .run();
            }
        });
    }, 1);
};

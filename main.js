#!/usr/local/bin/node
var commander = require('commander'),
    fswalk = require('fswalk'),
    server = require('./server'),
    handler = require('./handler'),
    mime = require('mime'),
    config = require('./config.json');

var options = commander
    .description('Convert videos using ffmpeg to either mp4 or webm (whichever your ffmpeg supports) ' +
        'that can be played with chromecast.\n  This script can be a tranmission script, so it will process files ' +
        'in TR_TORRENT_DIR')
    .option('-i, --input <path>', 'Input file')
    .option('--inputDir <path>', 'Will convert all video files in this dir')
    .option('-o, --output <path>', 'Specify output file, not used for input dir')
    .option('--outputDir <path>', 'Output to a different directory')
    .option('-d, --delete', 'Delete input file after conversion')
    .option('-w, --overwrite', 'Overwrite existing output file if there is one already')
    .option('-p, --port <port>', 'Server port')
    .parse(process.argv)
    .opts();

if (!(options.input || options.inputDir || process.env.TR_TORRENT_DIR)) {
    console.log('You must specify input');
    process.exit();
}

server(handler).then(function(send) {
    if (options.input) {
        send(options);
    }

    delete options.output;

    if (options.inputDir) {
        handleDir(options.inputDir);
    }

    if (process.env.TR_TORRENT_DIR) {
        options.outputDir = options.outputDir || config.outputDir;
        handleDir(process.env.TR_TORRENT_DIR);
    }

    function handleDir(dir) {
        fswalk(dir, function (file) {
            if (!file.match(/sample/) && mime.lookup(file).match(/video\//)) {
                options.input = file;
                send(options);
            }
        });
    }
});

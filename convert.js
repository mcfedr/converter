var fs = require('fs'),
    walk = require('fswalk'),
    mmm = require('mmmagic'),
    magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE),
    ffmpeg,
    path = require('path'),
    touch = require('touch'),
    config = require('./config'),
    subtitles = require('subtitles-parser'),
    async = require('async');

//We need to set the location of ffmpeg before loading the module
if (config.ffmpeg) {
    process.env.FFMPEG_PATH = config.ffmpeg;
}
ffmpeg = require('fluent-ffmpeg');

var waiting = [];
exports.convert = function(convertDir) {
    waiting.push(convertDir);
};

ffmpeg.getAvailableCodecs(function (err, codecs) {
    console.log('Checking formats', 'mp4: ' + ((codecs.libx264 && codecs.libvo_aacenc) ? 'yes' : 'no'), 'webm: ' + ((codecs.libvpx && codecs.libvorbis) ? 'yes' : 'no'));
    config.mp4 = config.mp4 && codecs.libx264 && codecs.libvo_aacenc;
    config.webm = config.webm && codecs.libvpx && codecs.libvorbis;
    exports.convert = convert;
    waiting.forEach(convert);
});

exports.queue = async.queue(function (task, cb) {
    console.log('Starting', task.output);
    task.ff
        .on('start', function (commandLine) {
            console.log('Spawned ffmpeg with command: ' + commandLine);
        })
        .on('codecData', function (data) {
            console.log('Input is ' + data.audio + ' audio with ' + data.video + ' video in ' + data.format + ' length ' + data.duration);
        })
        .on('progress', function (progress) {
            console.log('Progress', progress.percent.toFixed(2) + '%', task.output);
        })
        .on('end', function() {
            console.log('Complete', task.output);
            if (config.delete) {
                fs.unlink(task.input);
            }
            cb();
        })
        .on('error', function(err) {
            console.log('Error', task.output, err);
            cb(err);
        })
        .saveToFile(task.output);
}, 1);

function convert(convertDir) {
    console.log('Converting', convertDir);
    if (convertDir.indexOf(config.inDir) == 0) {//Only convert files in the inDir
        walk(convertDir, function (file, stats) {
            if (/sample/i.test(file)) {//Skip files with sample in the name
                console.log('Sample', file);
                return;
            }
            magic.detectFile(file, function (err, mime) {
                if (mime.match(/^video\//)) {//Only need to process videos
                    ffmpeg.Metadata(file, function (metadata, err) {
                        var ff = new ffmpeg({
                                source: file,
                                nolog: false,
                                timeout: 0,
                                logger: console
                            })
                                .addOptions(['-map 0:v:0', '-map 0:a:0']),
                            webm = config.webm,
                            mp4 = config.mp4,
                            output,
                            copyVideo = false,
                            copyAudio = false;

                        if (mp4 && metadata.video.codec == 'h264') {
                            console.log('Video: Copy (h264)', file);
                            ff.withVideoCodec('copy');
                            webm = false;
                            copyVideo = true;
                        }
                        else if (webm && metadata.video.codec == 'vp8') {
                            console.log('Video: Copy (vp8)', file);
                            ff.withVideoCodec('copy');
                            mp4 = false;
                            copyVideo = true;
                        }
                        else if (webm) {
                            console.log('Video: VPX (from ' + metadata.video.codec + ')', file);
                            ff.withVideoCodec('libvpx')
                                .withVideoBitrate(2048)
                                .addOption('-qmin', '0')
                                .addOption('-qmax', '50')
                                .addOption('-crf', '8');
                            mp4 = false;
                        }
                        else {
                            console.log('Video: x264 (from ' + metadata.video.codec + ')', file);
                            ff.withVideoCodec('libx264')
                                .withVideoBitrate(2048)
                                .addOption('-crf', '20')
                                .addOption('-preset', 'faster');
                            mp4 = true;
                        }

                        if (mp4 && (metadata.audio.codec == 'mp3' || metadata.audio.codec == 'aac')) {
                            console.log('Audio: Copy (mp3/aac)', file);
                            ff.withAudioCodec('copy');
                            copyAudio = true;
                        }
                        else if (webm && metadata.audio.codec == 'vorbis') {
                            console.log('Audio: Copy (vorbis)', file);
                            ff.withAudioCodec('copy');
                            copyAudio = true;
                        }
                        else if (webm) {
                            console.log('Audio: Vorbis (from ' + metadata.audio.codec + ')', file);
                            ff.withAudioCodec('libvorbis')
                                .withAudioBitrate(128)
                                .withAudioChannels(2)
                        }
                        else {
                            console.log('Audio: AAC (from ' + metadata.audio.codec + ')', file);
                            ff.withAudioCodec('libvo_aacenc')
                                .withAudioBitrate(128)
                                .withAudioChannels(2)
                        }

                        ff.toFormat(webm ? 'webm' : 'mp4');
                        output = outputName(file, (webm ? 'webm' : 'mp4'));

                        fs.exists(output, function (exists) {//Check the output file doesnt already exist
                            if (!config.overwrite && exists) {
                                console.log('Exists', output);
                            }
                            else {
                                touch(output);//Make the file exist, to stop other processes queueing the same file
                                exports.queue.push({
                                    output: output,
                                    input: file,
                                    ff: ff
                                });
                            }
                        });
                    });
                }
                else if (path.extname(file) == '.srt') {
                    console.log('Converting subtitles', file);
                    async.auto({
                        read: function (cb) {
                            fs.readFile(file, 'utf8', cb);
                        },
                        convert: ['read', function (cb, results) {
                            cb(null, subtitles.toWebVTT(subtitles.fromSrt(results.read)));
                        }],
                        write: ['convert', function (cb, results) {
                            fs.writeFile(outputName(file, 'vtt'), results.convert, 'utf8', cb);
                        }],
                        rm: ['write', function (cb) {
                            if (config.delete) {
                                fs.unlink(file, cb);
                            }
                            else {
                                cb();
                            }
                        }]
                    });
                }
                else {
                    console.log('Not a video', file);
                }
            });
        });
    }
    else {
        console.log('Rejected', convertDir);
    }
};

function outputName(file, ext) {
    var name = path.relative(config.inDir, file).replace(/\/| /g, '.');
    return path.join(config.outDir, path.basename(name, path.extname(name)) + '.' + ext);
}

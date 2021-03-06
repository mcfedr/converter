var ffmpeg = require('fluent-ffmpeg'),
    path = require('path'),
    Promise = require('promise'),
    winston = require('winston');

var available = new Promise(function(resolve, reject) {
    ffmpeg.getAvailableCodecs(function (err, codecs) {
        if (err) {
            return reject(err);
        }
        var mp4 = codecs.libx264 && codecs.aac,
            webm = codecs.libvpx && codecs.vorbis;
        winston.info('Checking format mp4: ' + (mp4 ? 'yes' : 'no'));
        winston.info('Checking format webm: ' + (webm ? 'yes' : 'no'));
        resolve({
            mp4: mp4,
            webm: webm
        });
    });
});

/**
 *
 * @param input path to the video file to convert
 * @returns Promise
 */
module.exports = function(options) {
    return available.then(function(available) {
        var mp4 = available.mp4,
            webm = available.webm;
        return new Promise(function(resolve, reject) {
            ffmpeg.ffprobe(options.input, function (err, metadata) {
                if (err) {
                    return reject(err);
                }

                var meta = metadata.streams.reduce(function(meta, stream, idx) {
                    meta[stream.codec_type] = meta[stream.codec_type] || {
                        codec: stream.codec_name,
                        idx: idx
                    };
                    return meta;
                }, {}),
                    ff = new ffmpeg(options.input, {
                        logger: winston
                    })
                        //Always use the first video and first audio tracks
                        .outputOptions(['-map 0:v:0', '-map 0:a:0']),
                    copyVideo = false,
                    copyAudio = false,
                    outputFormat = webm ? 'webm' : 'mp4';

                if (mp4 && meta.video.codec == 'h264') {
                    winston.info('Video: Copy (h264)', options.input);
                    ff.videoCodec('copy');
                    webm = false;
                    copyVideo = true;
                }
                else if (webm && meta.video.codec == 'vp8') {
                    winston.info('Video: Copy (vp8)', options.input);
                    ff.videoCodec('copy');
                    mp4 = false;
                    copyVideo = true;
                }
                else if (webm) {
                    winston.info('Video: VPX (from ' + meta.video.codec + ')', options.input);
                    ff.videoCodec('libvpx')
                        .videoBitrate(2048)
                        .addOption('-qmin', '0')
                        .addOption('-qmax', '50')
                        .addOption('-crf', '8');
                    mp4 = false;
                }
                else {
                    winston.info('Video: x264 (from ' + meta.video.codec + ')', options.input);
                    ff.videoCodec('libx264')
                        .videoBitrate(2048)
                        .addOption('-crf', '20')
                        .addOption('-preset', 'faster');
                    mp4 = true;
                }

                if (mp4 && (meta.audio.codec == 'mp3' || meta.audio.codec == 'aac')) {
                    winston.info('Audio: Copy (mp3/aac)', options.input);
                    ff.audioCodec('copy');
                    copyAudio = true;
                }
                else if (webm && meta.audio.codec == 'vorbis') {
                    winston.info('Audio: Copy (vorbis)', options.input);
                    ff.audioCodec('copy');
                    copyAudio = true;
                }
                else if (webm) {
                    winston.info('Audio: Vorbis (from ' + meta.audio.codec + ')', options.input);
                    ff.audioCodec('vorbis')
                        .audioBitrate(128)
                        .audioChannels(2)
                }
                else {
                    winston.info('Audio: AAC (from ' + meta.audio.codec + ')', options.input);
                    ff.audioCodec('aac')
                        .audioBitrate(128)
                        .audioChannels(2)
                }

                if (!options.output) {
                    options.output = (options.outputDir || path.dirname(options.input)) + '/' + path.basename(options.input, path.extname(options.input)) + (webm ? '.webm' : '.mp4');
                }

                if (copyAudio && copyVideo && metadata.format.format_name.indexOf(outputFormat) != -1) {
                    if (options.output == options.input) {
                        options.done = true;
                        resolve(options);
                    }
                    else {
                        options.copy = true;
                        resolve(options);
                    }
                } else {
                    //Make sure we don't try to output to the same place
                    if (options.output == options.input) {
                        options.output = (options.outputDir || path.dirname(options.input)) + '/' + path.basename(options.input, path.extname(options.input)) + '-converted.' + (webm ? 'webm' : 'mp4');
                    }
                    ff.format(outputFormat);
                    ff.output(options.output);

                    options.ff = ff;
                    resolve(options);
                }
            });
        });
    });
};

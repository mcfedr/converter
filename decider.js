var ffmpeg = require('fluent-ffmpeg'),
    path = require('path'),
    Promise = require('promise');

var available = new Promise(function(resolve, reject) {
    ffmpeg.getAvailableCodecs(function (err, codecs) {
        if (err) {
            return reject(err);
        }
        var mp4 = (codecs.h264 || codecs.libx264) && codecs.aac,
            webm = codecs.libvpx && codecs.vorbis;
        console.log('Checking format mp4: ' + (mp4 ? 'yes' : 'no') + ' (h264: ' + (codecs.h264 ? 'yes' : 'no') + ' libx264: ' + (codecs.libx264 ? 'yes' : 'no') + ')');
        console.log('Checking format webm: ' + (webm ? 'yes' : 'no'));
        resolve({
            mp4: mp4 && {
                h264: codecs.h264,
                libx264: codecs.libx264
            },
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
                        logger: console
                    })
                        //Always use the first video and first audio tracks
                        .outputOptions(['-map 0:v:0', '-map 0:a:0']),
                    copyVideo = false,
                    copyAudio = false,
                    outputFormat = webm ? 'webm' : 'mp4';

                if (mp4 && meta.video.codec == 'h264') {
                    console.log('Video: Copy (h264)', options.input);
                    ff.videoCodec('copy');
                    webm = false;
                    copyVideo = true;
                }
                else if (webm && meta.video.codec == 'vp8') {
                    console.log('Video: Copy (vp8)', options.input);
                    ff.videoCodec('copy');
                    mp4 = false;
                    copyVideo = true;
                }
                else if (webm) {
                    console.log('Video: VPX (from ' + meta.video.codec + ')', options.input);
                    ff.videoCodec('libvpx')
                        .videoBitrate(2048)
                        .addOption('-qmin', '0')
                        .addOption('-qmax', '50')
                        .addOption('-crf', '8');
                    mp4 = false;
                }
                else {
                    console.log('Video: x264 (from ' + meta.video.codec + ')', options.input);
                    ff.videoCodec(available.mp4.libx264 ? 'libx264' : 'h264')
                        .videoBitrate(2048)
                        .addOption('-crf', '20')
                        .addOption('-preset', 'faster');
                    mp4 = true;
                }

                if (mp4 && (meta.audio.codec == 'mp3' || meta.audio.codec == 'aac')) {
                    console.log('Audio: Copy (mp3/aac)', options.input);
                    ff.audioCodec('copy');
                    copyAudio = true;
                }
                else if (webm && meta.audio.codec == 'vorbis') {
                    console.log('Audio: Copy (vorbis)', options.input);
                    ff.audioCodec('copy');
                    copyAudio = true;
                }
                else if (webm) {
                    console.log('Audio: Vorbis (from ' + meta.audio.codec + ')', options.input);
                    ff.audioCodec('vorbis')
                        .audioBitrate(128)
                        .audioChannels(2)
                }
                else {
                    console.log('Audio: AAC (from ' + meta.audio.codec + ')', options.input);
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

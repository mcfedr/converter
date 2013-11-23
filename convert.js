var fs = require('fs'),
    walk = require('fswalk'),
    mmm = require('mmmagic'),
    magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE),
    ffmpeg,
    path = require('path'),
    touch = require('touch'),
    config = require('./config');

//We need to set the location of ffmpeg before loading the module
process.env.FFMPEG_PATH = config.ffmpeg;
ffmpeg = require('fluent-ffmpeg');

exports.queue = require('async').queue(function(task, cb) {
    console.log('Starting', task.output);
    task.ff
        .onProgress(function(progress) {
            console.log('Progress', progress.percent.toFixed(2) + '%', task.output);
        })
        .saveToFile(task.output, function() {
            console.log('Complete', task.output);
            fs.unlink(task.input);
            cb();
        });
}, 1);

exports.convert = function(convertDir) {
    console.log('Converting', convertDir);
    if(convertDir.indexOf(config.inDir) == 0) {
        walk(convertDir, function(file, stats) {
            if(/sample/i.test(file)) {//Skip files with sample in the name
                console.log('Sample', file);
            }
            else {
                magic.detectFile(file, function(err, mime) {
                    var output, name;
                    if(mime.match(/^video\//)) {//Only need to process videos
                        name = path.relative(config.inDir, file).replace(/\/| /g, '.');
                        if(mime != 'video/mp4' && mime != 'video/webm') {//mp4 and webm dont need converting
                            output = path.join(config.outDir, path.basename(name, path.extname(name)) + '.mp4');
                            fs.exists(output, function(exists) {//Check the output file doesnt already exist
                                if(exists) {
                                    console.log('Exists', output);
                                }
                                else {
                                    touch(output);//Make the file exist, to stop other processes queueing the same file
                                    exports.queue.push({
                                        output: output,
                                        input: file,
                                        ff: new ffmpeg({
                                            source: file,
                                            nolog: true,
                                            timeout: 0
                                        })
                                            .addOptions(['-map 0:0', '-map 0:1'])
                                            .withVideoBitrate('1024k')
                                            .withVideoCodec('libx264')
                                            .withAudioBitrate('128k')
                                            .withAudioCodec('libvo_aacenc')
                                            .withAudioChannels(2)
                                            .toFormat('mp4')
                                    });
                                }
                            });
                        }
                        else {//we can just move them
                            console.log('Moving', output);
                            output = path.join(config.outDir, name);
                            fs.rename(file, output, function() {
                                console.log('Moved', output);
                            });
                        }
                    }
                    else {
                        console.log('Not a video', file);
                    }
                });
            }
        });
    }
    else {
        console.log('Rejected', convertDir);
    }
}

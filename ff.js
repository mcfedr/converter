var config = require('./config'),
    mmm = require('mmmagic'),
    magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

//We need to set the location of ffmpeg before loading the module
process.env.FFMPEG_PATH = config.ffmpeg;
ffmpeg = require('fluent-ffmpeg');

//ffmpeg.getAvailableFormats(function(err, formats) {
//    console.log("Available formats:");
//    console.dir(formats);
//});

ffmpeg.getAvailableCodecs(function(err, codecs) {
    console.log("Available codecs:");
    console.dir(codecs.libvo_aacenc);
});

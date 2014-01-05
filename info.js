var config = require('./config');

//We need to set the location of ffmpeg before loading the module
process.env.FFMPEG_PATH = config.ffmpeg;
ffmpeg = require('fluent-ffmpeg');

ffmpeg.Metadata(process.argv[2], function(metadata, err) {
    console.log(require('util').inspect(metadata, false, null));
});

var config = require('./config');

//We need to set the location of ffmpeg before loading the module
process.env.FFMPEG_PATH = config.ffmpeg;
ffmpeg = require('fluent-ffmpeg');

ffmpeg.Metadata('/Users/mcfedr/Desktop/movie.mkv', function(metadata, err) {
    console.log(require('util').inspect(metadata, false, null));
});

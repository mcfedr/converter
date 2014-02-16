var config = require('./config'),
    mmm = require('mmmagic'),
    magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

//We need to set the location of ffmpeg before loading the module
process.env.FFMPEG_PATH = config.ffmpeg;
ffmpeg = require('fluent-ffmpeg');

ffmpeg.Metadata(process.argv[2], function(metadata, err) {
    console.log(require('util').inspect(metadata, false, null));
});

magic.detectFile(process.argv[2], function(err, mime) {
    console.log(mime);
});

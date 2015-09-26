# Converter

Convert videos using ffmpeg to either mp4 or webm (whichever your ffmpeg supports) that can be played with chromecast.
This script can be a tranmission script, so it will process files in TR_TORRENT_DIR

## Config

Create a config as `~/converter.json`.

This is used when running as a transmission download script.

Sample config file:

    {
      "outputDir": "/Users/mcfedr/TV",
      "ffmpeg": "/usr/local/bin/ffmpeg"
    }

## Formats

Converter will just move files that are already in mp4 or webm formats.

All other videos will be converted to mp4.

## Queue

Only one video is converted at a time. If you run a second copy of `converter` it will simple add the files to the queue
of the first.

## ffmpeg

Sometimes you will need to set and environment variable `FFMPEG_PATH` 

    FFMPEG_PATH=/usr/local/bin/ffmpeg /usr/local/bin/cast-converter -i /Users/mcfedr/TV/file.mkv -d >> /Users/mcfedr/.flexget/convert.log &

# Converter

It will only convert videos within the `inDir` setting folder.

## Config

Copy `config.json.sample` to `config.json`.

You must specify all the settings. `port` is just a random port number, the default is just fine.

`ffmpeg` is the path to the ffmpeg executable. Find it with `which ffmpeg` if it is installed on your system. Otherwise
download it.

## Usage

`converter /path/to/file.mp4`

Convert one file, the output will be in `outDir`.

`TR_TORRENT_DIR=/path/to/dir converter`

`converter /path/to/dir`

Search a directory for videos, they will be output to `outDir`.

`converter`

Convert all videos in `inDir`, they will be output to `outDir`.

## Formats

Converter will just move files that are already in mp4 or webm formats.

All other videos will be converted to mp4.

## Queue

Only one video is converted at a time. If you run a second copy of `converter` it will simple add the files to the queue
of the first.

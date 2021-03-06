import * as fs from 'fs-extra';
import ytdl from 'ytdl-core';
import { throttle } from 'lodash';

const NodeID3 = require('node-id3')
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('ffmpeg-static'));

function durationToMs(duration: string) {
  const split = duration.split(':');
  const hours = Number(split[0]) * 1000 * 60 * 60;
  const minutes = Number(split[1]) * 1000 * 60;
  const seconds = Number(split[2]) * 1000;
  return hours + minutes + seconds;
}

function splitAny(str: string, chars: string[]) {
  let arr: string[] = [];
  let running = '';
  for (let i = 0; i < str.length; ++i) {
    if (chars.includes(str[i])) {
      arr.push(running);
      running = '';
    } else {
      running += str[i];
    }
  }
  arr.push(running);
  return arr;
}

function splitTitle(videoTitle: string): { title: string, artist: string} {
  let split = splitAny(videoTitle, ['-', '–']);
  if (split.length > 1) {
    const artist = split[0].trim();
    split.splice(0, 1);
    const title = split.join('-').trim();
    return { title, artist };
  } else {
    return {
      title: videoTitle.trim(),
      artist: 'Unknown'
    };
  }
}

export async function download(id: string, out: string, progress: (type: 'downloading' | 'converting', percent: number) => void) {
  progress = throttle(progress, 1000);
  const info = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`);
  const formats = info.formats.filter(format => format.hasAudio && format.container == 'mp4').sort((a, b) => b.audioBitrate! - a.audioBitrate!);
  const format = formats[0];
  try {
    await new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { quality: format.itag });
      stream.pipe(fs.createWriteStream(out + '.mp4'));
      stream.on('progress', (_, downloaded, total) => progress('downloading', downloaded / total));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    await new Promise((resolve, reject) => {
      let duration = 0;
      ffmpeg(out + '.mp4').audioCodec('libmp3lame').on('codecData', function(data: any) {
        duration = durationToMs(data.duration);
      }).on('progress', function(info: any) {
        if (duration > 0) {
          progress('converting', Math.min(durationToMs(info.timemark) / duration, 1));
        }
      }).on('error', reject).on('end', resolve).save(out);
    });
    progress('converting', 1);
    let tags = splitTitle(info.videoDetails.title);
    await new Promise<void>((resolve, reject) => NodeID3.write(tags, out, (err: any) => {
      if (err) reject(err);
      resolve();
    }));
    return {
      videoId: info.videoDetails.videoId,
      youtubeUrl: info.videoDetails.video_url,
      videoTitle: info.videoDetails.title,
      ...tags,
      thumbnail: info.videoDetails.thumbnails[0].url
    };
  } finally {
    await fs.unlink(out + '.mp4');
  }
}
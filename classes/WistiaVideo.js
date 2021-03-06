const fs = require('fs');
const path = require('path');

const request = require('request-promise');
const { parse } = require('node-html-parser');

module.exports = class WistiaVideo {
  constructor(videoId, title) {
    this.id = videoId;
    this.title = title;
    this.downloadURL = undefined;
  }

  async getVideoUrl() {
    const { id } = this;

    const response = await request(
      `https://fast.wistia.net/embed/iframe/${id}?videoFoam=true`,
    );

    const parsedHTML = parse(response, { script: true });

    const videoScriptContent = parsedHTML.querySelectorAll('script')[4].text;

    const videoStartIndex = videoScriptContent.indexOf('[{"type');
    const videoEndIndex = videoScriptContent.indexOf(',"distilleryUrl":');

    const videoString = videoScriptContent.substring(
      videoStartIndex,
      videoEndIndex,
    );

    const videos = JSON.parse(videoString);

    let url;

    try {
      url = videos.find(
        (video) => video.display_name === '540p'
          || video.display_name === '720p'
          || video.display_name === '360p',
      ).url;
    } catch (error) {
      console.log(videos);
    }

    this.downloadURL = url;
  }

  async download() {
    const { downloadURL, title } = this;
    if (!downloadURL) await this.getVideoUrl();

    const downloadDirectory = 'downloads';

    if (
      !fs.existsSync(
        path.join(path.dirname(require.main.filename), downloadDirectory),
      )
    ) {
      fs.mkdirSync(
        path.join(path.dirname(require.main.filename), downloadDirectory),
      );
    }

    if (
      fs.existsSync(
        path.join(
          path.dirname(require.main.filename),
          downloadDirectory,
          `${title}.mp4`,
        ),
      )
    ) {
      console.log(`${title}.mp4 already exist, skipping`);
      return;
    }

    const file = fs.createWriteStream(
      path.join(path.dirname(require.main.filename), downloadDirectory, `${title}.mp4`),
    );

    const downloadRequest = request({
      uri: this.downloadURL,
      gzip: true,
    });

    downloadRequest.pipe(file);

    let currentProgress = 0;
    let totalLength;

    downloadRequest.on('response', (data) => {
      totalLength = data.headers['content-length'];
    });

    downloadRequest.on('data', (chunk) => {
      currentProgress += chunk.length;
      process.stdout.write(
        `Downloading video "${title}": ${(
          100
          * (currentProgress / totalLength)
        ).toFixed(2)}%\r`,
      );
    });

    downloadRequest.on('end', () => {
      process.stdout.write('Download finished \r');
      process.stdout.clearLine(); // clear current text
      process.stdout.cursorTo(0);
    });

    return new Promise((resolve, reject) => {
      downloadRequest.on('end', () => {
        process.stdout.write('Download finished \r');
        resolve();
      });
      downloadRequest.on('error', (error) => {
        reject(error);
      });
    });
  }
};

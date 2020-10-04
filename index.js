/* eslint-disable no-restricted-syntax */
/* eslint-disable max-classes-per-file */
const fs = require('fs');
const path = require('path');

const request = require('request-promise');
const { parse } = require('node-html-parser');

const getIdFromLink = require('./helpers/getIdFromLink');
const getTitleFromLink = require('./helpers/getTitleFromLink');

class Links {
  constructor(filePath) {
    this.filePath = filePath;
  }

  getVideoIds() {
    const links = fs.readFileSync(this.filePath, 'utf8');
    const linkLines = links.split('\n');

    const videoIds = linkLines.map((link) => ({
      id: getIdFromLink(link),
      title: getTitleFromLink(link),
    }));

    return videoIds;
  }
}

class WistiaVideo {
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

    const { url } = videos.find((video) => video.display_name === '540p');

    this.downloadURL = url;
  }

  async download() {
    const { downloadURL, id } = this;
    if (!downloadURL) await this.getVideoUrl();

    const downloadDirectory = 'downloads';

    if (!fs.existsSync(path.join(__dirname, downloadDirectory))) {
      fs.mkdirSync(path.join(__dirname, downloadDirectory));
    }

    const file = fs.createWriteStream(
      path.join(__dirname, downloadDirectory, `${id}.mp4`),
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
        `Downloading video ${id}: ${(
          100 *
          (currentProgress / totalLength)
        ).toFixed(2)}%\r`,
      );
    });

    downloadRequest.on('end', () => {
      process.stdout.write('Download finished \r');
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
}

const execute = async () => {
  const videoLinks = new Links('./links.txt');
  const videoIds = videoLinks.getVideoIds();

  for (const { id, title } of videoIds) {
    const video = new WistiaVideo(id, title);
    await video.download();
  }
};

execute();
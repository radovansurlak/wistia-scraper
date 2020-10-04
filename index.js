/* eslint-disable no-restricted-syntax */
const Links = require('./classes/Links');
const WistiaVideo = require('./classes/WistiaVideo');

const execute = async () => {
  const videoLinks = new Links('./links.txt');
  const videoIds = videoLinks.getVideoIds();

  for (const { id, title } of videoIds) {
    const video = new WistiaVideo(id, title);
    await video.download();
  }
};

execute();

const fs = require('fs');

const getIdFromLink = require('../helpers/getIdFromLink');
const getTitleFromLink = require('../helpers/getTitleFromLink');

module.exports = class Links {
  constructor(filePath) {
    this.filePath = filePath;
  }

  getVideoIds() {
    const links = fs.readFileSync(this.filePath, 'utf8');
    const linkLines = links.split('\n').filter(({ length }) => length !== 0);

    const videoIds = linkLines.map((link) => ({
      id: getIdFromLink(link),
      title: getTitleFromLink(link),
    }));

    return videoIds;
  }
};

module.exports = function getIdFromLink(link) {
  return link.match(/wvideo=([a-z0-9]*)">/)[1];
};

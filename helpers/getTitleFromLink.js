module.exports = function getTitleFromLink(link) {
  return link.match(/">(?!<)(.*)<\/a><\/p>/)[1];
};

const path = require('path');
const madge = require('madge');
const debug = require('debug')('madge-lib');

const createDot = (config) => {
  const { src, ...packageMadgeOptions } = config;

  const madgeOptions = {
    // madge 도구에서 gvpr -V 로 graphViz의 설치여부를 확인하는데,
    // 실제로 여기서 사용되는건 graphViz의 dot 명령어이다.
    // docker에서는 gpu API를 사용하려면 추가적인 세팅이 필요하므로 가짜 gvpr로 위장시킨다.
    graphVizPath: path.resolve(__dirname, '../node_modules/.bin'),
    ...packageMadgeOptions,
  };

  debug('madgeOptions %o', madgeOptions);

  return madge(src, madgeOptions).then((res) => res.dot());
}

module.exports = {
  createDot
}
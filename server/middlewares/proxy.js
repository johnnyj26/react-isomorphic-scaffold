const proxy = require('koa-proxy');

var myProxy = proxy({
  host: 'http://likezhiyan.com:9056/',
  match: /^\/getHomeMess/
})

export default {
  myProxy
}
var http = require('http'),
    moment = require('moment'),
    httpProxy = require('http-proxy'),
    config = require('config'),
    querystring = require('querystring'),

    phpTarget = config.get('be.host'),

    debug = require('debug')('sdk:proxy');

import Tracker from '../lib/tracker';

var tracker = Tracker(config.get('track.server'));

// 加载动态自定义白名单的 CORS
import CORS from '../lib/cors';


import _ from 'lodash';


const logfile = __dirname + '/../logs/proxy.log';
const winston = require('winston');
const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({ filename: logfile })
    ]
});


function setup(app) {

    let proxy = httpProxy.createProxyServer({});

    // 代理检查
    var proxyCheck = require('./proxy_check');
    var doProxyCheck = proxyCheck();


    //
    // Listen for the `error` event on `proxy`.
    proxy.on('error', function (err, req, res) {

        debug('@proxy err', moment().format(), req.method, req.url, err);
        res.status(500).json({
            code: -3,
            message: '服务端故障'
        });
        // res.redirect('/app/error');

    });

    //
    // Listen for the `proxyRes` event on `proxy`.
    //
    proxy.on('proxyRes', function (proxyRes, req, res) {

        // 普通的 http 错误由后端处理


        debug('@proxy end', moment().format(), req.method, req.url, proxyRes.statusCode, proxyRes.headers);
        // === proxyRes msg <Buffer 7b 22 62 61 6c 61 6e 63 65 5f 70 6c 75 73 22 3a 22 30 2e 30 30 22 2c 22 63 61 72 64 73 22 3a 5b 5d 7d> {"balance_plus":"0.00","cards":[]}
        // === proxyRes end
        var chunks = [];
        proxyRes.on("data", (chunk) => {
            debug("=== proxyRes msg", chunk, chunk.toString())
            chunks.push(chunk);
        })
        proxyRes.on("end", (chunk) => {

            var logName = (req.method + ' ' + req.url)
                .replace(/\/\d+/g, '/:id')
                .replace(/\?.*$/, '');

            var log = {
                name: 'rp.api.call',
                request: logName,
            };

            if (chunk) {
                chunks.push(chunk);
            }
            var buf = Buffer.concat(chunks);

            var body = {};
            try {
                body = JSON.parse(buf.toString('utf8'));
            }
            catch (e) {
                // 忽略

                debug("=== proxyRes end err");

            }

            debug("=== proxyRes end", body);

            var status = 'succeeded';
            if (proxyRes.statusCode >= 400 ||
                // 现在后端不太统一，有些接口用 http status 表示失败
                (body.code && ~~body.code != 0)
                // 有些用 status 200 + code 表示（失败非 0，成功可能没有 code，可能为 0000）
               ) {
                status = 'failed';
                log.errorStatus = proxyRes.statusCode;
                log.errorCode = body.code;
                log.errorMsg = body.message;
            }
            log.status = status;

            tracker.track(log, req);
        })
    });

    app.use(CORS(), function myProxy(req, res, next) {

        debug('@proxy init', req.url);

        // node 0.12 proxy post 请求时，会出“write after end” 的错误，目前
        // node-http-proxy 还未解决：
        // https://github.com/nodejitsu/node-http-proxy/issues/777
        //
        // 此处使用了以下链接给出的方法，重新构造 req，再代理，以兼容 0.10、0.12
        // https://github.com/nodejitsu/node-http-proxy/issues/180#issuecomment-97702206

        var checkedReq = doProxyCheck(req, res, next);
        //var checkedReq = req;

        if (!checkedReq) {
            return;
        }

        // @todo 需要测此处的性能

        var body, buffer, r, size;
        r = new http.IncomingMessage();

        // 将原始 request 的 user 传过来
        r.user = req.user;
        r.clientIP = req.clientIP;

        r.httpVersion = req.httpVersion;
        r.method = req.method;
        r.headers = req.headers;

        delete r.headers['accept-encoding'];

        r.headers['device-id'] = req.header('device-id') ?
            req.header('device-id') : _.get(req, 'user.device_id', '');

        if (!r.headers['request-id']) {
            r.headers['request-id'] = getRequestId();
        }

	if (req.accessToken) {
		r.headers['x-auth-token'] = req.accessToken;
	}

        r.url = checkedReq.url;

        r.socket = req.socket;

        // 由于 go 不认 json，所以都转成 form
        /* application/x-www-form-urlencoded */
        if (typeof checkedReq.body == 'object') {
            body = querystring.stringify(checkedReq.body);
        }
        else {
            // 用来处理微信支付的 XML body，
            // XML 以及其他纯文本的 body 需要透传到后端，
            // 由后端处理
            body = checkedReq.body;
        }
        debug('ori body', checkedReq.body);
        debug('str body', body);

        if (!body) {
            body = ' '; // 用 buffer proxy 请求时必须写点东西，否则请求会 hang
        }
        r.body = body;
        size = Buffer.byteLength(body); // 肯定是 ascii
        r.headers['content-type'] = "application/x-www-form-urlencoded";
        r.headers['content-length'] = size;

        /* json */
        // body = JSON.stringify(checkedReq.body);
        // r.body = body;
        // size = Buffer.byteLength(body, 'utf8');
        // r.headers['content-type'] = "application/json;charset=UTF-8";
        // r.headers['content-length'] = size;

        debug('proxy body', body, size);

        buffer = {};
        buffer.pipe = function (dest) {
            return process.nextTick(function () {
                return dest.write(body);
            });
        };


        let target = testGateway(req);

        debug('@proxy bgn', moment().format(), r.method, r.url, target );

        logger.info('proxy begin', {
            // 请求信息
            'request-id': r.headers['request-id'],
            'device-id':  r.headers['device-id'],
            'version':    req.header('version'),
            api:          r.method + ' ' + r.url,

            // 用户信息
            bid:          _.get(r, 'user.bid'),
            uid:          _.get(r, 'user.uid'),
            hb_uid:       _.get(r, 'user.hb_uid'),
            duid:         _.get(r, 'user.duid'),
            dealer_id:    _.get(r, 'user.dealer_id'),
            dealer_code:  _.get(r, 'user.dealer_code'),

            // 代理信息
            target:       target,
        });

        return proxy.web(r, res, {
            buffer: buffer,
            target: target,
            proxyTimeout: 9000
        });

    });
}

const goTarget = config.get('proxy.go');
const proxyDealers = config.get('proxy.go_dealers');
const proxyGoAll = config.get('proxy.go_all');
const proxyPathPatterns = [
    '/api/hongbao/(send|receive|detail|sent|received|generate-id|tranfer-ticket|transfer|ad-detail|settings)',
    '/api/hongbao/payment/money', // hongbao / payment
    '/hongbao-payment/bills', // hongbao - payment ，是否有错？
    '/api/hongbao/alipay'
];

function testGoPath(path) {
    debug('@testGoPath', path);

    for (let i = proxyPathPatterns.length - 1; i >= 0; i--) {
        let r = new RegExp(proxyPathPatterns[i]);
        if (r.test(path)) {
            return true;
        }
    }

    return false;
}

// 判断 dealer、判断 url，转发 go 或 php
function testGateway(req) {

    // 默认用 php
    let target = phpTarget;

    let versionNo = /\d/.exec(req.header('version'));
    // @TODO 判断配置

    let dealerShouldGo = false;
    if (proxyGoAll) {
        dealerShouldGo = true;
    }
    else if (req.user && _.includes(proxyDealers, ~~req.user.dealer_id)) {
        dealerShouldGo = true;
    }

    debug('dealerShouldGo', dealerShouldGo);
    debug('user', req.user);

    if (goTarget && req.user // 设置了 go 代理，包含用户（避免支付宝回调）
        && versionNo && versionNo[0] >= 3 // 版本 > 3
        && dealerShouldGo                 // 该商户需要用 GO
        && testGoPath(req.originalUrl)) {
        // mock 里的环信，用 go

        target = goTarget;
    }

    return target;
}

function getRequestId() {
    let id = Date.now() * 1000 + _.padStart(_.random(0, 9999), 4, '0');
    return id;
}

export default {
    setup: setup
};


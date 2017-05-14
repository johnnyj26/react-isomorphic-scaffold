import axios from 'axios'
// import {
//   browserHistory
// } from 'react-router';


// const host = 'http://10.10.1.10:90/';
const host = '/';
const headers = {
  'api-auth-method': 'b',
  'dealer-id': 1,
  'request-id': '',
  // 'x-auth-token': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZWFsZXJJZCI6InNpeGNuIiwibWFuYWdlSWQiOjEsIm1hbmFnZU5hbWUiOiI2Y24iLCJtYW5hZ2VUeXBlIjoiZGVhbGVyLWZpbmFuY2UiLCJ0aW1lc3RhbXAiOjE0ODA0OTkyNDN9.PdX-YEQdSsbOqGI7I_3togoJHioDWsjBwggtrpbQS6E"
}
const timeout = 10000 // 10s

const instance = axios.create({
  baseURL: host,
  timeout: timeout,
  headers: headers
});

// response interceptor
instance.interceptors.response.use(function(response) {

  // 如果是 token 过期，则退出登录
  // if (response.data.code === '4002') {
  //   console.log('token expired');
  //   return browserHistory.push('/app/logout');
  // }

  // Do something with response data
  return response;

}, function(error) {
  // Do something with response error
  return Promise.reject(error);
});

export default instance
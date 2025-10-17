const axios = require('axios');
const { HTTP_HOST } = require('./config');

// const PROD_API_URL = 'http://89.104.68.50'
// export const PROD_API_URL = 'https://pulse-retail.ru'
module.exports.PROD_API_URL = HTTP_HOST;
module.exports.PROD_AXIOS_INSTANCE = axios.create({
  baseURL: PROD_API_URL,
  timeout: 10000,
});

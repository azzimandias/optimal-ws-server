module.exports.PRODMODE = !(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);
// Тянем токен со страницы
module.exports.CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')
  ? document.querySelector('meta[name="csrf-token"]').content
  : null;
module.exports.HTTP_HOST = document.querySelector('meta[name="host"]')
  ? document.querySelector('meta[name="host"]').content
  : null;
module.exports.HTTP_ROOT = HTTP_HOST ? HTTP_HOST.replace('resales', '') : '';
module.exports.HOST_COMPONENT_ROOT = !PRODMODE ? '' : '/com/resales';

module.exports.BASE_NAME = PRODMODE ? '/resales' : '/';
module.exports.BASE_ROUTE = PRODMODE ? '/resales' : '';

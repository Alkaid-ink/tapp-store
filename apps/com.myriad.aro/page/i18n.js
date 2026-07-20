// i18n — loads from sandbox-injected window._TAPP_I18N
var LANG = window._TAPP_I18N || {};
var lang = LANG.zh || {};
var currentLocale = 'zh';

function setLocale(locale) {
  currentLocale = locale || 'zh';
  var key = currentLocale.startsWith('zh') ? 'zh' : currentLocale.startsWith('ja') ? 'ja' : 'en';
  lang = LANG[key] || LANG.en || {};
}

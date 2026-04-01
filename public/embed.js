(function() {
  'use strict';

  var scripts = document.querySelectorAll('script[data-form-id]');
  var script = scripts[scripts.length - 1];
  if (!script) return;

  var formId = script.getAttribute('data-form-id');
  if (!formId) return;

  var container = document.getElementById('efo-form-' + formId);
  if (!container) return;

  var baseUrl = script.src.replace(/\/embed\.js.*$/, '');

  var iframe = document.createElement('iframe');
  iframe.src = baseUrl + '/f/' + formId;
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '400px';
  iframe.style.transition = 'height 0.3s ease';
  iframe.loading = 'lazy';
  iframe.setAttribute('title', 'ContactHub Form');

  container.appendChild(iframe);

  // postMessageで高さを自動調整
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'efo-form-resize' && e.data.formId === formId) {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();

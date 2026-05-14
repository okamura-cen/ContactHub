(function () {
  'use strict';

  var scripts = document.querySelectorAll('script[data-form-id]');
  var script = scripts[scripts.length - 1];
  if (!script) return;

  var formId = script.getAttribute('data-form-id');
  if (!formId) return;

  var container = document.getElementById('efo-form-' + formId);
  if (!container) return;

  var baseUrl = script.src.replace(/\/embed-direct\.js.*$/, '');

  // セッションID（localStorage 永続化）
  function getSessionId() {
    try {
      var key = 'efo-session-id';
      var id = localStorage.getItem(key);
      if (!id) {
        id = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return 'anonymous';
    }
  }
  var sessionId = getSessionId();

  // イベント送信ユーティリティ
  // NOTE: sendBeacon に文字列を渡すと text/plain で送信され CORS セーフリストに入る
  // （Blob({type:'application/json'}) を使うとプリフライトが走り、クロスオリジンで
  // 実POSTがサイレントに失敗するケースがあるため避ける）
  function sendEvent(type, stepIndex) {
    var body = JSON.stringify({ type: type, sessionId: sessionId, stepIndex: stepIndex });
    var url = baseUrl + '/api/forms/' + formId + '/events';
    if (navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon(url, body)) return;
      } catch (e) {}
    }
    // フォールバック: fetch（プリフライト回避のため Content-Type ヘッダを指定しない）
    fetch(url, {
      method: 'POST',
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  // ステート管理
  var state = {
    definition: null,
    currentStep: 0,
    values: {},
    errors: {},
    submitting: false,
    submitted: false,
    startTime: Date.now(),
  };

  // ユーティリティ
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') el.className = attrs[k];
        else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    }
    if (children !== undefined && children !== null) {
      if (Array.isArray(children)) children.forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      else if (typeof children === 'string') el.textContent = children;
      else el.appendChild(children);
    }
    return el;
  }

  function toHalf(str) {
    return str.replace(/[０-９]/g, function (s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); });
  }

  // フィールドレンダラー
  function renderField(field) {
    var wrapper = h('div', { className: 'efo-field efo-field--' + field.type, 'data-field-id': field.id });

    if (field.type === 'heading') {
      wrapper.appendChild(h('h3', { className: 'efo-heading' }, field.label));
      return wrapper;
    }
    if (field.type === 'divider') {
      wrapper.appendChild(h('hr', { className: 'efo-divider' }));
      return wrapper;
    }

    // ラベル
    var labelEl = h('label', { className: 'efo-label', for: 'efo-' + field.id }, field.label);
    if (field.required) labelEl.appendChild(h('span', { className: 'efo-required' }, ' *'));
    wrapper.appendChild(labelEl);

    var val = state.values[field.id];

    switch (field.type) {
      case 'text':
      case 'date':
        wrapper.appendChild(renderInput(field, 'text', val));
        break;
      case 'email':
        wrapper.appendChild(renderInput(field, 'email', val, { inputMode: 'email', autocomplete: 'email' }));
        break;
      case 'tel':
        wrapper.appendChild(renderInput(field, 'tel', val, { inputMode: 'tel', autocomplete: 'tel' }));
        break;
      case 'textarea':
        var ta = h('textarea', {
          className: 'efo-textarea',
          id: 'efo-' + field.id,
          placeholder: field.placeholder || '',
          rows: '5',
          onInput: function (e) { state.values[field.id] = e.target.value; clearError(field.id); },
          onBlur: function () { validateField(field); },
        }, val || '');
        wrapper.appendChild(ta);
        break;
      case 'select':
        var sel = h('select', {
          className: 'efo-select',
          id: 'efo-' + field.id,
          onChange: function (e) { state.values[field.id] = e.target.value; clearError(field.id); },
          onBlur: function () { validateField(field); },
        });
        sel.appendChild(h('option', { value: '' }, '選択してください'));
        (field.options || []).forEach(function (opt) {
          var o = h('option', { value: opt }, opt);
          if (val === opt) o.selected = true;
          sel.appendChild(o);
        });
        wrapper.appendChild(sel);
        break;
      case 'radio':
        var radioGroup = h('div', { className: 'efo-radio-group' });
        (field.options || []).forEach(function (opt) {
          var label = h('label', { className: 'efo-radio-label' });
          var radio = h('input', {
            type: 'radio',
            className: 'efo-radio',
            name: 'efo-' + field.id,
            value: opt,
            onChange: function () { state.values[field.id] = opt; clearError(field.id); },
          });
          if (val === opt) radio.checked = true;
          label.appendChild(radio);
          label.appendChild(h('span', { className: 'efo-radio-text' }, opt));
          radioGroup.appendChild(label);
        });
        wrapper.appendChild(radioGroup);
        break;
      case 'checkbox':
        var cbGroup = h('div', { className: 'efo-checkbox-group' });
        var cbVals = val || [];
        (field.options || []).forEach(function (opt) {
          var label = h('label', { className: 'efo-checkbox-label' });
          var cb = h('input', {
            type: 'checkbox',
            className: 'efo-checkbox',
            value: opt,
            onChange: function (e) {
              var arr = state.values[field.id] || [];
              if (e.target.checked) arr = arr.concat(opt);
              else arr = arr.filter(function (v) { return v !== opt; });
              state.values[field.id] = arr;
              clearError(field.id);
            },
          });
          if (cbVals.indexOf(opt) >= 0) cb.checked = true;
          label.appendChild(cb);
          label.appendChild(h('span', { className: 'efo-checkbox-text' }, opt));
          cbGroup.appendChild(label);
        });
        wrapper.appendChild(cbGroup);
        break;
      case 'agree':
        var agreeLabel = h('label', { className: 'efo-agree-label' });
        var agreeCb = h('input', {
          type: 'checkbox',
          className: 'efo-agree-checkbox',
          onChange: function (e) { state.values[field.id] = e.target.checked; clearError(field.id); },
        });
        if (val) agreeCb.checked = true;
        agreeLabel.appendChild(agreeCb);
        var agreeTextSpan = h('span', { className: 'efo-agree-text' }, field.label);
        // linkUrl が設定されている場合はラベル横に「詳細」リンクを表示
        if (field.linkUrl) {
          agreeTextSpan.appendChild(document.createTextNode(' '));
          var detailLink = h('a', {
            className: 'efo-agree-link',
            href: field.linkUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            // ラベルクリックでチェックボックスがトグルされるので、リンククリックの伝播を止める
            onClick: function (e) { e.stopPropagation(); },
          }, '詳細');
          agreeTextSpan.appendChild(detailLink);
        }
        agreeLabel.appendChild(agreeTextSpan);
        wrapper.appendChild(agreeLabel);
        break;
      case 'zip':
        wrapper.appendChild(renderZipField(field));
        break;
      case 'name':
        wrapper.appendChild(renderNameField(field));
        break;
      case 'file':
        wrapper.appendChild(renderFileField(field));
        break;
    }

    // ヘルプテキスト
    if (field.helpText) {
      wrapper.appendChild(h('p', { className: 'efo-help' }, field.helpText));
    }

    // エラー表示用
    wrapper.appendChild(h('p', { className: 'efo-error', id: 'efo-error-' + field.id }));

    return wrapper;
  }

  function renderInput(field, type, val, extra) {
    var attrs = {
      className: 'efo-input',
      id: 'efo-' + field.id,
      type: type,
      placeholder: field.placeholder || '',
      value: val || '',
      onInput: function (e) {
        var v = e.target.value;
        if (type === 'email') v = v.replace(/[Ａ-Ｚａ-ｚ０-９＠．＿＋－]/g, function (s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); });
        if (type === 'tel') {
          v = toHalf(v).replace(/[^\d-]/g, '');
          var d = v.replace(/-/g, '');
          if (d.length > 3 && ['090','080','070','050'].indexOf(d.slice(0,3)) >= 0) {
            if (d.length <= 3) v = d;
            else if (d.length <= 7) v = d.slice(0,3) + '-' + d.slice(3);
            else v = d.slice(0,3) + '-' + d.slice(3,7) + '-' + d.slice(7,11);
          }
          e.target.value = v;
        }
        state.values[field.id] = v;
        clearError(field.id);
      },
      onBlur: function () { validateField(field); },
    };
    if (extra) Object.keys(extra).forEach(function (k) { attrs[k] = extra[k]; });
    return h('input', attrs);
  }

  function renderZipField(field) {
    var val = state.values[field.id] || { zipcode: '', prefecture: '', city: '', address: '' };
    state.values[field.id] = val;
    var group = h('div', { className: 'efo-zip-group' });

    // 郵便番号
    group.appendChild(h('label', { className: 'efo-sub-label' }, '郵便番号'));
    var zipInput = h('input', {
      className: 'efo-input efo-input--zip',
      inputMode: 'numeric',
      autocomplete: 'postal-code',
      placeholder: '123-4567',
      value: val.zipcode || '',
      onInput: function (e) {
        var v = toHalf(e.target.value).replace(/[^\d-]/g, '');
        var d = v.replace(/-/g, '');
        if (d.length > 3) v = d.slice(0, 3) + '-' + d.slice(3, 7);
        else v = d;
        e.target.value = v;
        val.zipcode = v;
        if (d.length === 7) fetchAddress(d, val, group);
      },
    });
    group.appendChild(zipInput);

    // 都道府県
    group.appendChild(h('label', { className: 'efo-sub-label' }, '都道府県'));
    group.appendChild(h('input', {
      className: 'efo-input efo-input--pref',
      autocomplete: 'address-level1',
      placeholder: '東京都',
      value: val.prefecture || '',
      'data-addr': 'prefecture',
      onInput: function (e) { val.prefecture = e.target.value; },
    }));

    // 市区町村
    group.appendChild(h('label', { className: 'efo-sub-label' }, '市区町村'));
    group.appendChild(h('input', {
      className: 'efo-input efo-input--city',
      autocomplete: 'address-level2',
      placeholder: '渋谷区',
      value: val.city || '',
      'data-addr': 'city',
      onInput: function (e) { val.city = e.target.value; },
    }));

    // 番地
    group.appendChild(h('label', { className: 'efo-sub-label' }, '番地・建物名'));
    group.appendChild(h('input', {
      className: 'efo-input efo-input--addr',
      autocomplete: 'street-address',
      placeholder: '1-2-3 サンプルビル101',
      value: val.address || '',
      'data-addr': 'address',
      onInput: function (e) { val.address = e.target.value; },
    }));

    return group;
  }

  function fetchAddress(zipcode, val, group) {
    fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + zipcode)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.results && data.results.length > 0) {
          var r = data.results[0];
          val.prefecture = r.address1;
          val.city = r.address2;
          val.address = r.address3;
          var pref = group.querySelector('[data-addr="prefecture"]');
          var city = group.querySelector('[data-addr="city"]');
          var addr = group.querySelector('[data-addr="address"]');
          if (pref) pref.value = r.address1;
          if (city) city.value = r.address2;
          if (addr) addr.value = r.address3;
        }
      })
      .catch(function () {});
  }

  function renderNameField(field) {
    var val = state.values[field.id] || { sei: '', mei: '', seiKana: '', meiKana: '' };
    state.values[field.id] = val;
    var group = h('div', { className: 'efo-name-group' });

    var row1 = h('div', { className: 'efo-name-row' });
    // 姓
    var seiWrap = h('div', { className: 'efo-name-col' });
    seiWrap.appendChild(h('label', { className: 'efo-sub-label' }, '姓'));
    seiWrap.appendChild(h('input', {
      className: 'efo-input',
      autocomplete: 'family-name',
      placeholder: '山田',
      value: val.sei || '',
      onInput: function (e) { val.sei = e.target.value; },
    }));
    row1.appendChild(seiWrap);

    // 名
    var meiWrap = h('div', { className: 'efo-name-col' });
    meiWrap.appendChild(h('label', { className: 'efo-sub-label' }, '名'));
    meiWrap.appendChild(h('input', {
      className: 'efo-input',
      autocomplete: 'given-name',
      placeholder: '太郎',
      value: val.mei || '',
      onInput: function (e) { val.mei = e.target.value; },
    }));
    row1.appendChild(meiWrap);
    group.appendChild(row1);

    var row2 = h('div', { className: 'efo-name-row' });
    // セイ
    var seiKanaWrap = h('div', { className: 'efo-name-col' });
    seiKanaWrap.appendChild(h('label', { className: 'efo-sub-label' }, 'セイ'));
    seiKanaWrap.appendChild(h('input', {
      className: 'efo-input',
      placeholder: 'ヤマダ',
      value: val.seiKana || '',
      onInput: function (e) { val.seiKana = e.target.value; },
    }));
    row2.appendChild(seiKanaWrap);

    // メイ
    var meiKanaWrap = h('div', { className: 'efo-name-col' });
    meiKanaWrap.appendChild(h('label', { className: 'efo-sub-label' }, 'メイ'));
    meiKanaWrap.appendChild(h('input', {
      className: 'efo-input',
      placeholder: 'タロウ',
      value: val.meiKana || '',
      onInput: function (e) { val.meiKana = e.target.value; },
    }));
    row2.appendChild(meiKanaWrap);
    group.appendChild(row2);

    return group;
  }

  // ファイル添付フィールド
  // 本体側 FileField.tsx と同等の UX（クリック選択 + ドラッグ&ドロップ）
  // /api/forms/:formId/upload に FormData で POST し、{ url, name, size, type } を state に保存
  // initial: { uploading?: boolean, error?: string } 再レンダー時の状態引き継ぎ用
  function renderFileField(field, initial) {
    initial = initial || {};
    var MAX_SIZE = 10 * 1024 * 1024; // 10MB（API側と同一）
    var ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';

    var group = h('div', { className: 'efo-file-group' });
    var current = state.values[field.id] || null;
    var uploading = !!initial.uploading;
    var localError = initial.error || '';

    // 共通エラー表示エリア（renderField で wrapper 末尾に追加されている）に反映
    // setTimeout で DOM 追加後に実行
    setTimeout(function () {
      var errEl = document.getElementById('efo-error-' + field.id);
      if (errEl) {
        errEl.textContent = localError;
        errEl.style.display = localError ? 'block' : 'none';
      }
    }, 0);

    function formatBytes(b) {
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function rerender(opts) {
      var next = renderFileField(field, opts || {});
      if (group.parentNode) group.parentNode.replaceChild(next, group);
    }

    function upload(file) {
      if (!file) return;
      if (file.size > MAX_SIZE) {
        rerender({ error: 'ファイルサイズが大きすぎます（最大10MB）' });
        return;
      }
      rerender({ uploading: true });

      var fd = new FormData();
      fd.append('file', file);

      fetch(baseUrl + '/api/forms/' + formId + '/upload', {
        method: 'POST',
        body: fd,
      })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, data: data }; });
        })
        .then(function (res) {
          if (!res.ok) {
            rerender({ error: (res.data && res.data.error) || 'アップロードに失敗しました' });
            return;
          }
          state.values[field.id] = {
            url: res.data.url,
            name: res.data.name,
            size: res.data.size,
            type: res.data.type,
          };
          clearError(field.id);
          rerender();
        })
        .catch(function () {
          rerender({ error: 'アップロードに失敗しました' });
        });
    }

    if (current && current.url) {
      // 選択済み表示
      var fileRow = h('div', { className: 'efo-file-selected' });
      var info = h('div', { className: 'efo-file-info' });
      info.appendChild(h('p', { className: 'efo-file-name' }, current.name));
      info.appendChild(h('p', { className: 'efo-file-size' }, formatBytes(current.size)));
      fileRow.appendChild(info);
      fileRow.appendChild(h('button', {
        type: 'button',
        className: 'efo-file-remove',
        onClick: function () {
          state.values[field.id] = null;
          rerender();
        },
      }, '削除'));
      group.appendChild(fileRow);
    } else {
      // ドロップゾーン
      var fileInput = h('input', {
        type: 'file',
        id: 'efo-' + field.id,
        accept: ACCEPT,
        style: { display: 'none' },
        onChange: function (e) {
          var f = e.target.files && e.target.files[0];
          if (f) upload(f);
        },
      });

      var dropZone = h('div', {
        className: 'efo-file-drop' + (uploading ? ' efo-file-drop--uploading' : ''),
        onClick: function () {
          if (!uploading) fileInput.click();
        },
        onDragover: function (e) {
          e.preventDefault();
          dropZone.classList.add('efo-file-drop--active');
        },
        onDragleave: function (e) {
          e.preventDefault();
          dropZone.classList.remove('efo-file-drop--active');
        },
        onDrop: function (e) {
          e.preventDefault();
          dropZone.classList.remove('efo-file-drop--active');
          if (uploading) return;
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) upload(f);
        },
      });

      if (uploading) {
        dropZone.appendChild(h('div', { className: 'efo-file-spinner' }));
        dropZone.appendChild(h('p', { className: 'efo-file-hint' }, 'アップロード中...'));
      } else {
        dropZone.appendChild(h('p', { className: 'efo-file-main' }, 'ここにドラッグ＆ドロップ'));
        dropZone.appendChild(h('p', { className: 'efo-file-sub' }, 'またはクリックしてファイルを選択（最大10MB）'));
      }

      group.appendChild(fileInput);
      group.appendChild(dropZone);
      group.appendChild(h('p', { className: 'efo-file-formats' }, '対応形式: 画像、PDF、Word、Excel、テキスト'));
    }

    return group;
  }

  // バリデーション
  function validateField(field) {
    var val = state.values[field.id];
    if (field.required) {
      if (field.type === 'name') {
        if (!val || !val.sei || !val.mei) return setError(field.id, '氏名を入力してください');
      } else if (field.type === 'zip') {
        if (!val || !val.zipcode) return setError(field.id, '郵便番号を入力してください');
      } else if (field.type === 'agree') {
        if (!val) return setError(field.id, '同意が必要です');
      } else if (field.type === 'file') {
        if (!val || !val.url) return setError(field.id, field.label + 'を添付してください');
      } else if (!val || (typeof val === 'string' && !val.trim())) {
        return setError(field.id, field.label + 'を入力してください');
      }
    }
    if (val && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return setError(field.id, '正しいメールアドレスを入力してください');
    }
    clearError(field.id);
    return true;
  }

  function validateStep(stepIndex) {
    var step = state.definition.steps[stepIndex];
    var valid = true;
    step.fields.forEach(function (f) {
      if (['heading', 'divider'].indexOf(f.type) >= 0) return;
      if (validateField(f) !== true) valid = false;
    });
    return valid;
  }

  function setError(fieldId, msg) {
    state.errors[fieldId] = msg;
    var el = document.getElementById('efo-error-' + fieldId);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    var input = document.getElementById('efo-' + fieldId);
    if (input) input.classList.add('efo-input--error');
    return false;
  }

  function clearError(fieldId) {
    delete state.errors[fieldId];
    var el = document.getElementById('efo-error-' + fieldId);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
    var input = document.getElementById('efo-' + fieldId);
    if (input) input.classList.remove('efo-input--error');
  }

  // レンダリング
  function render() {
    container.innerHTML = '';
    container.className = 'efo-form-container';

    if (state.submitted) {
      var msg = (state.definition.settings && state.definition.settings.successMessage) || '送信が完了しました。ありがとうございます。';
      container.appendChild(h('div', { className: 'efo-complete' }, [
        h('div', { className: 'efo-complete-icon' }, '✓'),
        h('h2', { className: 'efo-complete-title' }, '送信完了'),
        h('p', { className: 'efo-complete-message' }, msg),
      ]));
      return;
    }

    var def = state.definition;
    var totalSteps = def.steps.length;

    // 進捗バー（複数ステップの場合）
    if (totalSteps > 1) {
      var pct = ((state.currentStep + 1) / (totalSteps + 1)) * 100;
      var bar = h('div', { className: 'efo-progress' });
      var barInner = h('div', { className: 'efo-progress-bar' }, [
        h('div', { className: 'efo-progress-fill', style: { width: pct + '%' } }),
      ]);
      bar.appendChild(h('div', { className: 'efo-progress-info' }, [
        h('span', {}, def.steps[state.currentStep].title),
        h('span', {}, Math.round(pct) + '%'),
      ]));
      bar.appendChild(barInner);
      container.appendChild(bar);
    }

    // フィールド
    var step = def.steps[state.currentStep];
    var fieldsContainer = h('div', { className: 'efo-fields' });
    step.fields.forEach(function (f) {
      fieldsContainer.appendChild(renderField(f));
    });
    container.appendChild(fieldsContainer);

    // ボタン
    var buttons = h('div', { className: 'efo-buttons' });
    if (state.currentStep > 0) {
      buttons.appendChild(h('button', {
        className: 'efo-btn efo-btn--back',
        type: 'button',
        onClick: function () { state.currentStep--; render(); },
      }, '戻る'));
    }
    var isLast = state.currentStep === totalSteps - 1;
    buttons.appendChild(h('button', {
      className: 'efo-btn efo-btn--next',
      type: 'button',
      onClick: function () {
        if (!validateStep(state.currentStep)) return;
        // ステップ完了イベント
        sendEvent('STEP_COMPLETE', state.currentStep);
        if (isLast) {
          submitForm();
        } else {
          state.currentStep++;
          render();
          container.scrollIntoView({ behavior: 'smooth' });
        }
      },
    }, state.submitting ? '送信中...' : (isLast ? '送信する' : '次へ')));
    container.appendChild(buttons);
  }

  function submitForm() {
    state.submitting = true;
    render();

    fetch(baseUrl + '/api/forms/' + formId + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: state.values,
        metadata: { completionTimeMs: Date.now() - state.startTime },
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        state.submitting = false;
        if (result.success) {
          // 送信完了イベント（リダイレクト前に sendBeacon で確実に送る）
          sendEvent('SUBMIT');
          if (result.redirectUrl) { window.location.href = result.redirectUrl; return; }
          state.submitted = true;
        }
        render();
      })
      .catch(function () {
        state.submitting = false;
        render();
      });
  }

  // デフォルトスタイル（CSSで上書き可能）
  function injectDefaultStyles() {
    if (document.getElementById('efo-default-styles')) return;
    var style = document.createElement('style');
    style.id = 'efo-default-styles';
    style.textContent = [
      '.efo-form-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 600px; margin: 0 auto; }',
      '.efo-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; text-align: center; }',
      '.efo-fields { display: flex; flex-direction: column; gap: 1.25rem; }',
      '.efo-field { display: flex; flex-direction: column; }',
      '.efo-label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }',
      '.efo-sub-label { font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; display: block; }',
      '.efo-required { color: #e53e3e; }',
      '.efo-input, .efo-textarea, .efo-select { width: 100%; padding: 0.5rem 0.75rem; font-size: 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; outline: none; box-sizing: border-box; transition: border-color 0.15s; }',
      '.efo-input:focus, .efo-textarea:focus, .efo-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }',
      '.efo-input--error { border-color: #e53e3e !important; }',
      '.efo-input--zip { max-width: 10rem; }',
      '.efo-error { font-size: 0.75rem; color: #e53e3e; margin-top: 0.25rem; display: none; }',
      '.efo-help { font-size: 0.75rem; color: #666; margin-top: 0.25rem; }',
      '.efo-radio-group, .efo-checkbox-group { display: flex; flex-direction: column; gap: 0.5rem; }',
      '.efo-radio-label, .efo-checkbox-label, .efo-agree-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem; border-radius: 0.375rem; min-height: 2.75rem; }',
      '.efo-radio-label:hover, .efo-checkbox-label:hover, .efo-agree-label:hover { background: #f3f4f6; }',
      '.efo-agree-link { color: #3b82f6; text-decoration: underline; font-size: 0.875rem; margin-left: 0.25rem; }',
      '.efo-agree-link:hover { opacity: 0.8; }',
      '.efo-name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem; }',
      '.efo-zip-group { display: flex; flex-direction: column; gap: 0.5rem; }',
      '.efo-heading { font-size: 1.125rem; font-weight: 600; padding-top: 0.5rem; }',
      '.efo-divider { border: none; border-top: 1px solid #e5e7eb; margin: 0.5rem 0; }',
      '.efo-progress { margin-bottom: 1.5rem; }',
      '.efo-progress-info { display: flex; justify-content: space-between; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }',
      '.efo-progress-bar { height: 0.5rem; background: #e5e7eb; border-radius: 9999px; overflow: hidden; }',
      '.efo-progress-fill { height: 100%; background: #3b82f6; border-radius: 9999px; transition: width 0.3s; }',
      '.efo-buttons { display: flex; gap: 0.75rem; margin-top: 2rem; }',
      '.efo-btn { flex: 1; padding: 0.75rem; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; border: none; transition: background 0.15s; }',
      '.efo-btn--next { background: #3b82f6; color: white; }',
      '.efo-btn--next:hover { background: #2563eb; }',
      '.efo-btn--back { background: white; color: #374151; border: 1px solid #d1d5db; }',
      '.efo-btn--back:hover { background: #f9fafb; }',
      '.efo-complete { text-align: center; padding: 3rem 0; }',
      '.efo-complete-icon { font-size: 2.5rem; margin-bottom: 1rem; }',
      '.efo-complete-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }',
      '.efo-complete-message { color: #666; }',
      /* ファイル添付フィールド */
      '.efo-file-group { display: flex; flex-direction: column; }',
      '.efo-file-drop { border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem 1rem; text-align: center; cursor: pointer; transition: all 0.15s; background: #fafafa; }',
      '.efo-file-drop:hover { border-color: #3b82f6; background: #f3f6ff; }',
      '.efo-file-drop--active { border-color: #3b82f6; background: #eff4ff; }',
      '.efo-file-drop--uploading { opacity: 0.6; cursor: not-allowed; }',
      '.efo-file-main { font-size: 0.875rem; color: #444; margin: 0 0 0.25rem; }',
      '.efo-file-sub { font-size: 0.75rem; color: #666; margin: 0; }',
      '.efo-file-formats { font-size: 0.75rem; color: #888; margin: 0.5rem 0 0; }',
      '.efo-file-spinner { width: 1.5rem; height: 1.5rem; border: 2px solid #d1d5db; border-top-color: #3b82f6; border-radius: 50%; animation: efo-spin 0.8s linear infinite; margin: 0 auto 0.5rem; }',
      '.efo-file-hint { font-size: 0.875rem; color: #666; margin: 0; }',
      '@keyframes efo-spin { to { transform: rotate(360deg); } }',
      '.efo-file-selected { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: #f9fafb; }',
      '.efo-file-info { flex: 1; min-width: 0; }',
      '.efo-file-name { font-size: 0.875rem; font-weight: 500; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.efo-file-size { font-size: 0.75rem; color: #666; margin: 0; }',
      '.efo-file-remove { background: none; border: none; color: #e53e3e; font-size: 0.75rem; cursor: pointer; padding: 0.25rem 0.5rem; flex-shrink: 0; }',
      '.efo-file-remove:hover { text-decoration: underline; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // 初期化
  injectDefaultStyles();
  container.textContent = '読み込み中...';

  fetch(baseUrl + '/api/forms/' + formId + '/definition')
    .then(function (r) { return r.json(); })
    .then(function (def) {
      state.definition = def;
      render();
      // 閲覧イベント（フォーム定義の取得に成功したタイミングで送信）
      sendEvent('VIEW');
    })
    .catch(function () {
      container.textContent = 'フォームの読み込みに失敗しました';
    });
})();

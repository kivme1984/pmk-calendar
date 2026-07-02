'use strict';

(function startSmartParserFeatureGate(globalScope) {
  const params = new URLSearchParams(globalScope.location?.search || '');
  const enabled = params.get('smart-parser') === '1';
  const gate = {
    version: '1',
    enabled,
    state: enabled ? 'loading' : 'disabled',
    error: '',
  };
  globalScope.PMK_SMART_PARSER_FEATURE_GATE = gate;

  if (!enabled || typeof document === 'undefined') return;

  const VERSION = '1';
  const styles = [
    './smart-parser-feature-gate.css',
    './smart-parser-form-adapter.css',
    './smart-parser-form-mobile-fix.css',
  ];
  const scripts = [
    './smart-parser-next-core.js',
    './smart-parser-next.js',
    './smart-parser-next-refinements.js',
    './smart-parser-next-real-rules.js',
    './smart-parser-next-scope-rules.js',
    './smart-parser-next-final-rules.js',
    './smart-parser-next-identical-rugs.js',
    './smart-parser-form-adapter.js',
  ];

  function withVersion(path) {
    const url = new URL(path, globalScope.location.href);
    url.searchParams.set('smart-parser-feature', VERSION);
    return url.href;
  }

  function loadStyle(path) {
    const id = `pmk-smart-style-${path.replace(/[^a-z0-9]/gi, '-')}`;
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = withVersion(path);
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Не загрузился стиль ${path}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(path) {
    const id = `pmk-smart-script-${path.replace(/[^a-z0-9]/gi, '-')}`;
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = withVersion(path);
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Не загрузился модуль ${path}`));
      document.head.appendChild(script);
    });
  }

  function normalModeUrl() {
    const url = new URL('./', globalScope.location.href);
    url.searchParams.set('v', '82.19.1');
    return url.href;
  }

  function ensureBanner() {
    let banner = document.getElementById('smartParserModeBanner');
    if (banner) return banner;
    banner = document.createElement('aside');
    banner.id = 'smartParserModeBanner';
    banner.className = 'smart-parser-mode-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <div>
        <strong>Умный ввод · тестовый режим</strong>
        <span id="smartParserModeStatus">Загружаем модули распознавания…</span>
      </div>
      <a href="${normalModeUrl()}">Обычный режим</a>`;
    document.body.appendChild(banner);
    return banner;
  }

  function setBannerStatus(message, isError = false) {
    const banner = ensureBanner();
    banner.classList.toggle('is-error', isError);
    const status = banner.querySelector('#smartParserModeStatus');
    if (status) status.textContent = message;
  }

  async function boot() {
    document.documentElement.dataset.smartParserMode = 'loading';
    ensureBanner();
    await Promise.all(styles.map(loadStyle));
    for (const script of scripts) await loadScript(script);

    const started = Date.now();
    while (!document.getElementById('smartParserFormPanel')) {
      if (Date.now() - started > 16000) throw new Error('Панель умного ввода не появилась');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    gate.state = 'ready';
    document.documentElement.dataset.smartParserMode = 'ready';
    setBannerStatus('Текст разбирается локально. Заявка сохраняется только штатной кнопкой формы.');
    globalScope.dispatchEvent(new CustomEvent('pmk:smart-parser-ready'));
  }

  gate.ready = boot().catch(error => {
    gate.state = 'error';
    gate.error = String(error?.message || error);
    document.documentElement.dataset.smartParserMode = 'error';
    setBannerStatus(`Ошибка запуска: ${gate.error}`, true);
    if (typeof globalScope.showToast === 'function') globalScope.showToast(`Умный ввод не запустился: ${gate.error}`, 'error');
    throw error;
  });
})(typeof window !== 'undefined' ? window : globalThis);

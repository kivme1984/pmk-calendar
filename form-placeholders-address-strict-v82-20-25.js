'use strict';

(() => {
  // Отключено в cardfix32: старый слой пересобирал адресный блок на каждый клик/ввод
  // и ломал выбор подсказок DaData. Финальные лёгкие правила находятся в
  // today-final-release-v82-20-30.js.
  if (globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_DISABLED_V82_20_32) return;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_25 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_26 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_27 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_29 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_DISABLED_V82_20_32 = true;
})();

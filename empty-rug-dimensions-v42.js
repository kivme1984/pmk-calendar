'use strict';

(() => {
  const originalAddRug = addRug;

  addRug = function addRugWithEmptyDimensions(data = {}) {
    const before = qsa('.rug-card').length;
    originalAddRug(data);

    const cards = qsa('.rug-card');
    const card = cards[before] || cards.at(-1);
    if (!card) return;

    const hasLength = Number(data.length || 0) > 0;
    const hasWidth = Number(data.width || 0) > 0;

    const lengthInput = qs('.rug-length', card);
    const widthInput = qs('.rug-width', card);

    if (!hasLength && lengthInput) lengthInput.value = '';
    if (!hasWidth && widthInput) widthInput.value = '';

    lengthInput?.removeAttribute('value');
    widthInput?.removeAttribute('value');
    updateRugTotal(card);
  };
})();

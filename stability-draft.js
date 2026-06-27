'use strict';

const PMK_DRAFT_KEY = 'pmk-form-autodraft-v1';
function pmkDraftRead() {
  try {
    const value = JSON.parse(localStorage.getItem(PMK_DRAFT_KEY) || 'null');
    return value?.data && Date.now() - value.savedAt < 604800000 ? value : null;
  } catch { return null; }
}
let pmkDraftTimer;
function pmkDraftSave() {
  clearTimeout(pmkDraftTimer);
  pmkDraftTimer = setTimeout(() => {
    if (state.currentView !== 'form' || qs('#eventId').value) return;
    const data = getFormData();
    const useful = data.customerName || data.phone || data.street || data.managerComment || data.estimatedPrice;
    if (useful) localStorage.setItem(PMK_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  }, 500);
}
function pmkDraftRestore() {
  const saved = pmkDraftRead();
  if (!saved) return showToast('Черновик не найден.', 'error');
  fillForm({ ...saved.data, eventId: '', pmkId: makeId() });
  qs('#eventId').value = '';
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка — восстановленный черновик';
  setView('form');
}

const pmkSaveOriginal = saveRequest;
saveRequest = async (data, localOnly = false) => {
  const button = qs('#submitBtn');
  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Сохраняем…';
  }
  try {
    await pmkSaveOriginal(data, localOnly);
    if (state.currentView !== 'form') localStorage.removeItem(PMK_DRAFT_KEY);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
    updateConnectionUI();
  }
};

function pmkDraftInit() {
  if (!PMK_ADDRESS_API_URL) qs('#addressSearchWrap')?.remove();
  const form = qs('#requestForm');
  form?.addEventListener('input', pmkDraftSave);
  form?.addEventListener('change', pmkDraftSave);
  const saved = pmkDraftRead();
  if (saved && form && !qs('#pmkDraftRestore')) {
    const bar = document.createElement('div');
    bar.id = 'pmkDraftRestore';
    bar.className = 'warning-box';
    bar.innerHTML = '<strong>Есть незавершённая заявка.</strong> <button type="button" class="mini-button">Восстановить</button>';
    form.insertBefore(bar, form.firstChild);
    qs('button', bar).addEventListener('click', pmkDraftRestore);
  }
  updateConnectionUI();
  renderAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pmkDraftInit, { once: true });
else pmkDraftInit();

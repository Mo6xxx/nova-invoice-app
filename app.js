const LS_KEY = 'nova_invoices_v1';
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };

let invoices = [];
let currentInvoice = null;
let isNew = false;
let saveTimeout = null;

const $ = (id) => document.getElementById(id);

function init() {
  loadInvoices();
  wireEvents();
  renderList();
  checkUrlInvoice();
}

function loadInvoices() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      invoices = JSON.parse(raw);
    } catch {
      invoices = [];
    }
  }
  if (!Array.isArray(invoices)) invoices = [];
}

function saveAll() {
  localStorage.setItem(LS_KEY, JSON.stringify(invoices));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseNumberFromInv(num) {
  const digits = (num || '').replace(/\D/g, '');
  return parseInt(digits, 10) || 1669;
}

function nextInvoiceNumber() {
  const max = invoices.reduce((m, inv) => Math.max(m, parseNumberFromInv(inv.number)), 1669);
  return `FAC${max + 1}`;
}

function defaultFrom() {
  return {
    name: 'Nova Studio',
    email: 'hello@novastudio.dev',
    address: 'Oosteindweg 457-1',
    city: 'Aalsmeer',
    postal: '1432BJ',
    phone: '0685671317',
    businessNumber: '12345678 / VAT: NL000000000B01',
    website: 'www.novastudio.dev',
    owner: 'Nova Studio'
  };
}

function defaultTo() {
  return { name: '', email: '', address: '', phone: '', mobile: '', fax: '' };
}

function createInvoice() {
  isNew = true;
  const today = new Date().toISOString().slice(0, 10);
  currentInvoice = {
    id: generateId(),
    number: nextInvoiceNumber(),
    date: today,
    terms: 'On Receipt',
    currency: 'EUR',
    from: defaultFrom(),
    to: defaultTo(),
    items: [{ description: 'Item Description', details: '', rate: 0, qty: 1 }],
    tax: { type: 'none', value: 0 },
    discount: { type: 'none', value: 0 },
    notes: ''
  };
  loadInvoiceData(currentInvoice, true, true);
  showView('editor');
}

function loadInvoiceData(data, newFlag, resetForm) {
  currentInvoice = data;
  isNew = newFlag;

  setVal('from-name', data.from?.name);
  setVal('from-email', data.from?.email);
  setVal('from-address', data.from?.address);
  setVal('from-city', data.from?.city);
  setVal('from-postal', data.from?.postal);
  setVal('from-phone', data.from?.phone);
  setVal('from-business', data.from?.businessNumber);
  setVal('from-website', data.from?.website);
  setVal('from-owner', data.from?.owner);

  setVal('to-name', data.to?.name);
  setVal('to-email', data.to?.email);
  setVal('to-address', data.to?.address);
  setVal('to-phone', data.to?.phone);
  setVal('to-mobile', data.to?.mobile);
  setVal('to-fax', data.to?.fax);

  setVal('invoice-number', data.number);
  setVal('invoice-date', data.date);
  setVal('invoice-terms', data.terms || 'On Receipt');
  setVal('invoice-currency', data.currency || 'EUR');

  setVal('tax-type', data.tax?.type || 'none');
  setVal('tax-value', data.tax?.value ?? 0);
  setVal('discount-type', data.discount?.type || 'none');
  setVal('discount-value', data.discount?.value ?? 0);

  setVal('invoice-notes', data.notes);

  const container = $('items-container');
  container.innerHTML = '';
  (data.items || []).forEach((item) => addItem(item));

  updatePreview();
}

function setVal(id, value) {
  const el = $(id);
  if (el) el.value = value ?? '';
}

function addItem(item = { description: '', details: '', rate: 0, qty: 1 }) {
  const container = $('items-container');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="item-desc" placeholder="Description" value="${escapeHtml(item.description || '')}" />
    <input type="text" class="item-details" placeholder="Additional details" value="${escapeHtml(item.details || '')}" />
    <input type="number" class="item-rate" min="0" step="0.01" value="${item.rate ?? 0}" />
    <input type="number" class="item-qty" min="0" step="0.01" value="${item.qty ?? 1}" />
    <button class="remove-item" title="Remove" aria-label="Remove item">×</button>
  `;

  row.querySelector('.remove-item').addEventListener('click', () => {
    row.remove();
    updateCurrentFromForm();
    updatePreview();
    scheduleSave();
  });

  row.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      updateCurrentFromForm();
      updatePreview();
      scheduleSave();
    });
  });

  container.appendChild(row);
}

function getItemsFromForm() {
  const rows = document.querySelectorAll('.item-row');
  const items = [];
  rows.forEach((row) => {
    items.push({
      description: row.querySelector('.item-desc').value,
      details: row.querySelector('.item-details').value,
      rate: parseFloat(row.querySelector('.item-rate').value) || 0,
      qty: parseFloat(row.querySelector('.item-qty').value) || 0
    });
  });
  return items;
}

function updateCurrentFromForm() {
  if (!currentInvoice) return;

  currentInvoice.number = $('invoice-number').value;
  currentInvoice.date = $('invoice-date').value;
  currentInvoice.terms = $('invoice-terms').value;
  currentInvoice.currency = $('invoice-currency').value;

  currentInvoice.from = {
    name: $('from-name').value,
    email: $('from-email').value,
    address: $('from-address').value,
    city: $('from-city').value,
    postal: $('from-postal').value,
    phone: $('from-phone').value,
    businessNumber: $('from-business').value,
    website: $('from-website').value,
    owner: $('from-owner').value
  };

  currentInvoice.to = {
    name: $('to-name').value,
    email: $('to-email').value,
    address: $('to-address').value,
    phone: $('to-phone').value,
    mobile: $('to-mobile').value,
    fax: $('to-fax').value
  };

  currentInvoice.items = getItemsFromForm();
  currentInvoice.tax = {
    type: $('tax-type').value,
    value: parseFloat($('tax-value').value) || 0
  };
  currentInvoice.discount = {
    type: $('discount-type').value,
    value: parseFloat($('discount-value').value) || 0
  };
  currentInvoice.notes = $('invoice-notes').value;
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (!currentInvoice) return;
    if (isNew) {
      invoices.unshift(currentInvoice);
      isNew = false;
    }
    saveAll();
  }, 600);
}

function saveCurrent() {
  if (!currentInvoice) return;
  clearTimeout(saveTimeout);
  updateCurrentFromForm();
  if (isNew) {
    invoices.unshift(currentInvoice);
    isNew = false;
  }
  saveAll();
  renderList();
  showView('list');
}

function showView(view) {
  $('list-view').classList.toggle('hidden', view !== 'list');
  $('editor-view').classList.toggle('hidden', view !== 'editor');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', window.location.pathname);
}

function fmtMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || '€';
  const value = (amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${value}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function getInvoiceTotal(inv) {
  const subtotal = (inv.items || []).reduce((s, item) => s + (item.rate * item.qty), 0);
  let discount = 0;
  if (inv.discount?.type === 'percent') discount = subtotal * (inv.discount.value / 100);
  else if (inv.discount?.type === 'fixed') discount = inv.discount.value;
  discount = Math.min(discount, subtotal);
  const taxable = subtotal - discount;
  let tax = 0;
  if (inv.tax?.type === 'percent') tax = taxable * (inv.tax.value / 100);
  else if (inv.tax?.type === 'fixed') tax = inv.tax.value;
  return taxable + tax;
}

function updatePreview() {
  if (!currentInvoice) return;
  const ci = currentInvoice;

  $('preview-brand').textContent = ci.from?.name || 'Nova';

  const fromLines = [
    ci.from?.name,
    ci.from?.email,
    ci.from?.address,
    `${ci.from?.city || ''} ${ci.from?.postal || ''}`.trim(),
    ci.from?.phone,
    ci.from?.businessNumber,
    ci.from?.website,
    ci.from?.owner
  ].filter(Boolean);
  $('preview-from').innerHTML = fromLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');

  const toLines = [
    ci.to?.name,
    ci.to?.email,
    ci.to?.address,
    ci.to?.phone,
    ci.to?.mobile,
    ci.to?.fax
  ].filter(Boolean);
  $('preview-to').innerHTML = toLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');

  $('preview-number').textContent = ci.number;
  $('preview-date').textContent = formatDate(ci.date);
  $('preview-terms').textContent = ci.terms;

  const tbody = $('preview-items-body');
  tbody.innerHTML = '';
  let subtotal = 0;
  (ci.items || []).forEach((item) => {
    const amount = item.rate * item.qty;
    subtotal += amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="item-title">${escapeHtml(item.description || '')}</div>
        ${item.details ? `<div class="item-desc-text">${escapeHtml(item.details)}</div>` : ''}
      </td>
      <td class="numeric">${fmtMoney(item.rate, ci.currency)}</td>
      <td class="numeric">${item.qty}</td>
      <td class="numeric">${fmtMoney(amount, ci.currency)}</td>
    `;
    tbody.appendChild(tr);
  });

  let discount = 0;
  if (ci.discount?.type === 'percent') discount = subtotal * (ci.discount.value / 100);
  else if (ci.discount?.type === 'fixed') discount = ci.discount.value;
  discount = Math.min(discount, subtotal);

  const taxable = subtotal - discount;
  let tax = 0;
  if (ci.tax?.type === 'percent') tax = taxable * (ci.tax.value / 100);
  else if (ci.tax?.type === 'fixed') tax = ci.tax.value;

  const total = taxable + tax;

  $('preview-subtotal').textContent = fmtMoney(subtotal, ci.currency);

  const discRow = $('preview-discount-row');
  if (discount > 0) {
    discRow.style.display = 'table-row';
    $('preview-discount').textContent = `-${fmtMoney(discount, ci.currency)}`;
  } else {
    discRow.style.display = 'none';
  }

  const taxRow = $('preview-tax-row');
  if (tax > 0) {
    taxRow.style.display = 'table-row';
    $('preview-tax').textContent = fmtMoney(tax, ci.currency);
  } else {
    taxRow.style.display = 'none';
  }

  $('preview-total').textContent = fmtMoney(total, ci.currency);
  $('preview-balance').textContent = fmtMoney(total, ci.currency);
  $('preview-notes').textContent = ci.notes || '';
}

function renderList() {
  const tbody = $('invoice-list');
  const q = ($('search-input').value || '').toLowerCase();
  const filtered = invoices.filter(
    (inv) =>
      (inv.to?.name || '').toLowerCase().includes(q) ||
      (inv.number || '').toLowerCase().includes(q)
  );

  filtered.sort((a, b) => new Date(b.date || '1900-01-01') - new Date(a.date || '1900-01-01'));

  tbody.innerHTML = '';

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty">No invoices found. Create one.</td></tr>';
    $('total-balance').textContent = '€0.00';
    $('invoice-count').textContent = '0';
    return;
  }

  let grandTotal = 0;
  let primaryCurrency = 'EUR';

  filtered.forEach((inv) => {
    const total = getInvoiceTotal(inv);
    grandTotal += total;
    primaryCurrency = inv.currency || primaryCurrency;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="inv-number">${escapeHtml(inv.number || '')}</td>
      <td>${escapeHtml(inv.to?.name || '—')}</td>
      <td>${formatDate(inv.date)}</td>
      <td class="numeric">${fmtMoney(total, inv.currency)}</td>
    `;
    tr.addEventListener('click', () => {
      currentInvoice = inv;
      isNew = false;
      loadInvoiceData(inv, false, true);
      showView('editor');
    });
    tbody.appendChild(tr);
  });

  $('total-balance').textContent = fmtMoney(grandTotal, primaryCurrency);
  $('invoice-count').textContent = filtered.length;
}

function downloadPDF() {
  if (!currentInvoice) return;
  updateCurrentFromForm();
  const element = $('invoice-preview');
  const filename = `Invoice-${currentInvoice.number}.pdf`;
  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => toast('PDF downloaded'))
    .catch((err) => {
      console.error(err);
      toast('PDF generation failed');
    });
}

function printInvoice() {
  if (!currentInvoice) return;
  updateCurrentFromForm();
  window.print();
}

function encodeInvoice(data) {
  const json = JSON.stringify(data);
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
}

function decodeInvoice(encoded) {
  const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
  return JSON.parse(json);
}

function getLink() {
  if (!currentInvoice) return;
  updateCurrentFromForm();
  const encoded = encodeInvoice(currentInvoice);
  const url = `${window.location.origin}${window.location.pathname}?invoice=${encoded}`;
  try {
    navigator.clipboard.writeText(url).then(() => toast('Invoice link copied'));
    history.replaceState(null, '', `?invoice=${encoded}`);
  } catch {
    toast('Could not copy link');
  }
}

function checkUrlInvoice() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('invoice');
  if (!encoded) {
    showView('list');
    return;
  }
  try {
    const data = decodeInvoice(encoded);
    currentInvoice = data;
    isNew = false;
    loadInvoiceData(data, false, true);
    showView('editor');
  } catch (err) {
    console.error(err);
    showView('list');
  }
}

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function wireEvents() {
  $('new-invoice-btn').addEventListener('click', createInvoice);
  $('back-btn').addEventListener('click', saveCurrent);
  $('add-item-btn').addEventListener('click', () => {
    addItem({ description: '', details: '', rate: 0, qty: 1 });
    updateCurrentFromForm();
    updatePreview();
    scheduleSave();
  });
  $('search-input').addEventListener('input', renderList);
  $('download-btn').addEventListener('click', downloadPDF);
  $('print-btn').addEventListener('click', printInvoice);
  $('get-link-btn').addEventListener('click', getLink);

  const fieldIds = [
    'from-name', 'from-email', 'from-address', 'from-city', 'from-postal',
    'from-phone', 'from-business', 'from-website', 'from-owner',
    'to-name', 'to-email', 'to-address', 'to-phone', 'to-mobile', 'to-fax',
    'invoice-number', 'invoice-date', 'invoice-terms', 'invoice-currency',
    'tax-type', 'tax-value', 'discount-type', 'discount-value', 'invoice-notes'
  ];

  fieldIds.forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', () => { updateCurrentFromForm(); updatePreview(); scheduleSave(); });
  });
}

document.addEventListener('DOMContentLoaded', init);

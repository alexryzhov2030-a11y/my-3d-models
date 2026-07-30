/**
 * script.js — Витрина 3D-моделей
 * Загружает models.json с GitHub и отображает каталог
 */

const CONFIG = {
    owner: 'alexryzhov2030-a11y',
    repo: 'my-3d-models',
    filePath: 'models.json'
};

/* ---------- DOM ---------- */
const catalog       = document.getElementById('catalog');
const modal         = document.getElementById('modal');
const modalBody     = document.getElementById('modal-body');
const orderModal    = document.getElementById('orderModal');
const orderModalBody= document.getElementById('orderModalBody');
const themeToggle   = document.getElementById('themeToggle');
const orderCloseBtn = document.getElementById('orderCloseBtn');

let modelsData = [];
let currentModel = null;

/* ---------- Тема ---------- */

function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ---------- Каталог ---------- */

async function loadModels() {
    if (!catalog) return;
    catalog.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">⏳ Загрузка моделей...</div>';

    try {
        // Публичный raw-URL (не требует токена)
        const url = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/${CONFIG.filePath}`;
        const res = await fetch(url, { cache: 'no-store' });

        if (res.status === 404) {
            catalog.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">📭 Пока нет моделей</div>';
            return;
        }
        if (!res.ok) throw new Error('Сервер вернул ошибку');

        const text = await res.text();
        let models;
        try { models = JSON.parse(text); } catch (e) { throw new Error('Ошибка в данных каталога'); }

        if (!Array.isArray(models) || !models.length) {
            catalog.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">📭 Пока нет моделей</div>';
            return;
        }

        modelsData = models;
        renderCatalog(models);
    } catch (err) {
        console.error('[Catalog]', err);
        catalog.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">❌ Не удалось загрузить модели<br><small style="opacity:.6;">${err.message}</small></div>`;
    }
}

function renderCatalog(models) {
    if (!catalog) return;
    catalog.innerHTML = '';

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-image">
                <img src="${model.photo || ''}" alt="${escapeHtml(model.name)}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x400/0a0a12/00d4ff?text=3D'" />
                <span class="badge">3D</span>
            </div>
            <div class="card-info">
                <div class="card-tag">МОДЕЛЬ</div>
                <h3>${escapeHtml(model.name || 'Без названия')}</h3>
                <div class="price">${escapeHtml(model.price || '0 ₽')}</div>
                <div class="card-actions">
                    <button class="btn-order" onclick="event.stopPropagation(); window.orderModel('${model.id}')">Заказать</button>
                    <button class="btn-details" onclick="event.stopPropagation(); window.openModel('${model.id}')">Подробнее</button>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openModel(model.id));
        catalog.appendChild(card);
    });
}

/* ---------- Модалка деталей ---------- */

function openModel(id) {
    const model = modelsData.find(m => m.id === id);
    if (!model) return;
    currentModel = model;

    const galleryHtml = (model.gallery || []).map(url =>
        `<img src="${url}" alt="" loading="lazy" onerror="this.style.display='none'" />`
    ).join('');

    const videoHtml = model.video
        ? `<video controls><source src="${model.video}" type="video/mp4" /></video>` : '';

    modalBody.innerHTML = `
        <h2>${escapeHtml(model.name)}</h2>
        <div class="price">${escapeHtml(model.price)}</div>
        ${videoHtml}
        ${galleryHtml ? `<div class="gallery">${galleryHtml}</div>` : ''}
        <div class="description">${escapeHtml(model.description || 'Описание отсутствует')}</div>
        <button class="btn-order-in-modal" onclick="window.orderModel('${model.id}')">📦 Заказать эту модель</button>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModals() {
    if (modal) modal.classList.add('hidden');
    if (orderModal) orderModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/* ---------- Модалка заказа ---------- */

function orderModel(id) {
    const model = modelsData.find(m => m.id === id);
    if (!model) return;
    currentModel = model;

    // Закрываем детали, если открыты
    if (modal) modal.classList.add('hidden');

    orderModalBody.innerHTML = `
        <div style="display:flex;gap:16px;margin-bottom:20px;align-items:center;">
            <img src="${model.photo || ''}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;background:var(--bg-primary);"
                 onerror="this.style.display='none'" />
            <div>
                <div style="font-size:18px;font-weight:700;color:var(--text-primary);">${escapeHtml(model.name)}</div>
                <div style="font-size:24px;font-weight:800;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${escapeHtml(model.price)}</div>
            </div>
        </div>
        <form id="orderForm" style="display:flex;flex-direction:column;gap:14px;">
            <input type="text" placeholder="Ваше имя" required
                   style="padding:12px 16px;border-radius:12px;border:1px solid var(--border-color);background:var(--glass-bg);color:var(--text-primary);font-family:inherit;font-size:15px;outline:none;" />
            <input type="email" placeholder="Email" required
                   style="padding:12px 16px;border-radius:12px;border:1px solid var(--border-color);background:var(--glass-bg);color:var(--text-primary);font-family:inherit;font-size:15px;outline:none;" />
            <textarea placeholder="Комментарий к заказу" rows="3"
                      style="padding:12px 16px;border-radius:12px;border:1px solid var(--border-color);background:var(--glass-bg);color:var(--text-primary);font-family:inherit;font-size:15px;outline:none;resize:vertical;"></textarea>
            <button type="submit"
                    style="padding:14px;background:linear-gradient(135deg,#00d4ff,#0077ff);border:none;border-radius:30px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:all .3s;">✅ Подтвердить заказ</button>
        </form>
    `;

    orderModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    document.getElementById('orderForm').addEventListener('submit', (e) => {
        e.preventDefault();
        orderModalBody.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <div style="font-size:48px;margin-bottom:16px;">🎉</div>
                <h3 style="font-size:22px;color:var(--text-primary);margin-bottom:8px;">Заказ оформлен!</h3>
                <p style="color:var(--text-secondary);">Мы свяжемся с вами по email для уточнения деталей.</p>
                <button onclick="window.closeOrderModal()"
                        style="margin-top:24px;padding:12px 24px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:12px;color:var(--text-primary);cursor:pointer;">Закрыть</button>
            </div>
        `;
    });
}

function closeOrderModal() {
    if (orderModal) orderModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/* ---------- Утилиты ---------- */

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadModels();

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Закрытие крестиками
    document.querySelectorAll('.close-btn').forEach(btn => {
        if (btn.id === 'orderCloseBtn') {
            btn.addEventListener('click', closeOrderModal);
        } else {
            btn.addEventListener('click', closeModals);
        }
    });

    // Закрытие по клику вне контента
    [modal, orderModal].forEach(m => {
        if (m) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
    });
});

/* Глобальные ссылки для inline-вызовов */
window.openModel = openModel;
window.orderModel = orderModel;
window.closeOrderModal = closeOrderModal;
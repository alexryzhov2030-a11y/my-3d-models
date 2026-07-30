/**
 * admin.js — Админ-панель маркетплейса 3D-моделей
 * Репозиторий: alexryzhov2030-a11y/my-3d-models
 * 
 * Функционал:
 * - Показывает модели из models.json (как на витрине)
 * - Добавляет новые модели (без замены старых)
 * - Удаляет модели
 * - Предпросмотр карточки
 */

const CONFIG = {
    owner: 'alexryzhov2030-a11y',
    repo: 'my-3d-models',
    filePath: 'models.json'
};

// DOM-элементы
const tokenInput = document.getElementById('tokenInput');
const updateBtn = document.getElementById('updateBtn');
const modelsContainer = document.getElementById('modelsList');
const modelsCount = document.getElementById('modelsCount');
const statusEl = document.getElementById('status');
const uploadForm = document.getElementById('uploadForm');

// Таймер для debounce
let debounceTimer;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(type, message) {
    if (!statusEl) return;
    statusEl.className = type;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
}

function showMessage(html) {
    if (modelsContainer) {
        modelsContainer.innerHTML = `<div class="admin-status">${html}</div>`;
    }
    if (modelsCount) modelsCount.textContent = '0';
}

// === ЗАГРУЗКА МОДЕЛЕЙ ===

async function loadModels() {
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!token) {
        showMessage('⚠️ Вставь токен в поле выше');
        return;
    }

    showMessage('⏳ Загружаю список моделей...');

    try {
        const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.filePath}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        });

        if (response.status === 404) {
            showMessage('📭 Пока нет моделей');
            return;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Ошибка ${response.status}`);
        }

        const fileData = await response.json();
        const cleanBase64 = fileData.content.replace(/\s/g, '');
        const rawContent = atob(cleanBase64);
        const models = JSON.parse(rawContent);

        if (!Array.isArray(models) || models.length === 0) {
            showMessage('📭 Пока нет моделей');
            return;
        }

        renderModels(models);

    } catch (error) {
        console.error('[Admin] Ошибка загрузки:', error);
        showMessage(`❌ ${error.message}`);
    }
}

// === ОТРИСОВКА КАРТОЧЕК (как на витрине) ===

function renderModels(models) {
    if (!modelsContainer) return;

    if (modelsCount) modelsCount.textContent = models.length;

    let html = '<div class="models-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;">';

    models.forEach(model => {
        const photo = model.photo || 'https://via.placeholder.com/400x300/0a0a12/00d4ff?text=3D';
        const name = model.name || 'Без названия';
        const price = model.price || '0 ₽';
        const id = model.id || Date.now().toString();

        html += `
            <div class="model-card" style="background:rgba(255,255,255,0.03);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);transition:transform 0.2s;">
                <img src="${photo}" alt="${escapeHtml(name)}" 
                     style="width:100%;height:180px;object-fit:cover;background:#0a0a12;"
                     onerror="this.src='https://via.placeholder.com/400x180/0a0a12/00d4ff?text=3D'" />
                <div style="padding:14px 16px 18px;">
                    <h4 style="font-size:16px;font-weight:600;color:#fff;margin:0 0 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</h4>
                    <div style="font-size:20px;font-weight:800;color:#00d4ff;margin:4px 0 10px 0;">${escapeHtml(price)}</div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="viewModel('${id}')" style="flex:1;padding:8px;background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:8px;color:#ccc;cursor:pointer;">👁️</button>
                        <button onclick="deleteModel('${id}')" style="flex:1;padding:8px;background:rgba(255,51,102,0.05);border:1px solid rgba(255,51,102,0.1);border-radius:8px;color:#ff3366;cursor:pointer;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    modelsContainer.innerHTML = html;
}

// === ПРОСМОТР МОДЕЛИ ===

async function viewModel(id) {
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { alert('Вставь токен в поле выше'); return; }

    try {
        const models = await getModelsFromGitHub(token);
        const model = models.find(m => m.id === id);
        if (!model) { alert('Модель не найдена'); return; }

        let modal = document.getElementById('viewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewModal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" id="viewModalClose">✕</span>
                    <div id="viewModalBody"></div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('viewModalClose').addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            });
        }

        const body = document.getElementById('viewModalBody');

        let galleryHtml = '';
        if (model.gallery && model.gallery.length > 0) {
            galleryHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin:12px 0;">`;
            model.gallery.forEach(img => {
                galleryHtml += `<img src="${img}" style="width:100%;border-radius:8px;aspect-ratio:1;object-fit:cover;border:1px solid rgba(255,255,255,0.06);" onerror="this.style.display='none'" />`;
            });
            galleryHtml += `</div>`;
        }

        let videoHtml = '';
        if (model.video) {
            videoHtml = `<video controls style="width:100%;border-radius:12px;margin:12px 0;background:#0a0a12;border:1px solid rgba(255,255,255,0.06);"><source src="${model.video}" type="video/mp4" /></video>`;
        }

        body.innerHTML = `
            <h2 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 2px 0;">${escapeHtml(model.name)}</h2>
            <div style="font-size:28px;font-weight:800;color:#00d4ff;margin:4px 0 12px 0;">${escapeHtml(model.price)}</div>
            ${videoHtml}
            ${galleryHtml}
            <div style="color:#aaa;line-height:1.8;background:rgba(255,255,255,0.02);padding:14px 18px;border-radius:12px;border-left:3px solid #00d4ff;margin:4px 0 0 0;">${escapeHtml(model.description || 'Описание отсутствует')}</div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        alert('Ошибка просмотра: ' + error.message);
    }
}

// === УДАЛЕНИЕ МОДЕЛИ ===

async function deleteModel(id) {
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { alert('Вставь токен в поле выше'); return; }
    if (!confirm('🗑️ Удалить эту модель?')) return;

    try {
        const { models, sha } = await getModelsAndShaFromGitHub(token);
        const deleted = models.find(m => m.id === id);
        const updated = models.filter(m => m.id !== id);
        await saveModelsToGitHub(updated, token, sha);
        await loadModels();
        showStatus('success', `🗑️ Модель "${deleted ? deleted.name : ''}" удалена!`);
        setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 3000);
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

// === РАБОТА С GITHUB API ===

async function getModelsFromGitHub(token) {
    const { models } = await getModelsAndShaFromGitHub(token);
    return models;
}

async function getModelsAndShaFromGitHub(token) {
    const response = await fetch(
        `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.filePath}`,
        {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        }
    );

    if (response.status === 404) {
        return { models: [], sha: null };
    }
    if (!response.ok) {
        throw new Error(`GitHub API ошибка: ${response.status}`);
    }

    const data = await response.json();
    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    const parsed = JSON.parse(content);
    return {
        models: Array.isArray(parsed) ? parsed : [],
        sha: data.sha
    };
}

async function saveModelsToGitHub(models, token, sha) {
    if (!Array.isArray(models)) {
        throw new Error('models должен быть массивом');
    }

    const jsonContent = JSON.stringify(models, null, 2);
    const content = btoa(unescape(encodeURIComponent(jsonContent)));

    const payload = {
        message: `Обновление моделей ${new Date().toLocaleString()}`,
        content: content
    };
    if (sha) payload.sha = sha;

    const response = await fetch(
        `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.filePath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(payload)
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
            throw new Error('Конфликт версий файла (sha устарел). Обнови страницу и попробуй снова.');
        }
        throw new Error(`GitHub API ошибка: ${response.status} - ${errorData.message || 'Неизвестная ошибка'}`);
    }
    return await response.json();
}

// === DEBOUNCE ===

function onTokenInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        loadModels();
    }, 400);
}

// === ИНИЦИАЛИЗАЦИЯ ===

document.addEventListener('DOMContentLoaded', () => {
    if (!tokenInput || !modelsContainer) {
        console.error('[Admin] Не найдены #tokenInput или #modelsList в DOM');
        return;
    }

    // 1. При загрузке страницы — автозагрузка, если токен уже есть
    if (tokenInput.value.trim()) {
        loadModels();
    } else {
        showMessage('⚠️ Вставь токен в поле выше');
    }

    // 3. Автообновление при вводе / вставке токена
    tokenInput.addEventListener('input', onTokenInput);

    // 4. Кнопка «Обновить список»
    if (updateBtn) {
        updateBtn.addEventListener('click', loadModels);
    }
});

// Делаем функции глобальными для вызова из HTML
window.viewModel = viewModel;
window.deleteModel = deleteModel;
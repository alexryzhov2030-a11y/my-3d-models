/**
 * admin.js — Админ-панель маркетплейса 3D-моделей
 * Репозиторий: alexryzhov2030-a11y/my-3d-models
 * 
 * Возможности:
 * - Автозагрузка списка моделей при старте / вводе токена
 * - Загрузка файлов (фото, видео, галерея) на GitHub
 * - Добавление модели к существующим (без замены)
 * - Предпросмотр карточки, удаление, просмотр деталей
 * - Обработка ошибок GitHub API (401, 404, 409, 422)
 */

const CONFIG = {
    owner: 'alexryzhov2030-a11y',
    repo: 'my-3d-models',
    filePath: 'models.json',
    assetsPath: 'assets'
};

/* ---------- DOM-элементы ---------- */
const tokenInput        = document.getElementById('tokenInput');
const refreshBtn        = document.getElementById('refreshBtn');
const modelsContainer   = document.getElementById('modelsList');
const modelsCount       = document.getElementById('modelsCount');
const statusEl          = document.getElementById('status');
const uploadForm        = document.getElementById('uploadForm');
const submitBtn         = document.getElementById('submitBtn');
const progressBar       = document.getElementById('progressBar');
const progressFill      = document.getElementById('progressFill');
const progressText      = document.getElementById('progressText');

// Поля формы
const nameInput         = document.getElementById('name');
const priceInput        = document.getElementById('price');
const descInput         = document.getElementById('description');
const photoInput        = document.getElementById('photo');
const videoInput        = document.getElementById('video');
const galleryInput      = document.getElementById('gallery');

// Drop-зоны
const photoDrop  = document.getElementById('photoDrop');
const videoDrop  = document.getElementById('videoDrop');
const galleryDrop= document.getElementById('galleryDrop');

// Превью файлов
const photoPreview  = document.getElementById('photoPreview');
const videoPreview  = document.getElementById('videoPreview');
const galleryPreview= document.getElementById('galleryPreview');
const cardPreview   = document.getElementById('cardPreview');

// Модалка предпросмотра витрины
const previewBtn      = document.getElementById('previewBtn');
const previewModal    = document.getElementById('previewModal');
const previewContainer= document.getElementById('previewContainer');
const previewClose    = document.getElementById('previewClose');

/* ---------- Состояние ---------- */
let debounceTimer = null;
let currentFiles  = { photo: null, video: null, gallery: [] };

/* ---------- Утилиты ---------- */

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Показывает статусное сообщение под формой */
function showStatus(type, message) {
    if (!statusEl) return;
    statusEl.className = type;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    if (type !== 'loading') {
        setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
    }
}

/** Показывает сообщение в блоке списка моделей */
function showMessage(html) {
    if (modelsContainer) {
        modelsContainer.innerHTML = `<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3);">${html}</div>`;
    }
    if (modelsCount) modelsCount.textContent = '0';
}

/** Обновляет прогресс-бар */
function setProgress(percent, text) {
    if (!progressBar || !progressFill || !progressText) return;
    progressBar.classList.remove('hidden');
    progressFill.style.width = percent + '%';
    progressText.textContent = text || (percent + '%');
    if (percent >= 100) setTimeout(() => progressBar.classList.add('hidden'), 800);
}

/** Форматирует цену: 2500 → 2 500 ₽ */
function formatPrice(price) {
    const num = parseInt(String(price).replace(/\D/g, ''), 10);
    if (isNaN(num)) return price;
    return num.toLocaleString('ru-RU') + ' ₽';
}

/* ---------- GitHub API ---------- */

/**
 * Читает models.json и возвращает { models, sha } одним запросом.
 * Обрабатывает 401, 404, битый JSON.
 */
async function getModelsAndSha(token) {
    const res = await fetch(
        `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.filePath}`,
        {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        }
    );

    if (res.status === 404) {
        // Файл ещё не создан — начинаем с пустого массива
        return { models: [], sha: null };
    }

    if (res.status === 401) {
        throw new Error('401: Неправильный GitHub токен. Проверьте, что токен действителен и имеет доступ к репозиторию.');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${err.message || 'Не удалось прочитать models.json'}`);
    }

    const data = await res.json();
    let content;
    try {
        const clean = data.content.replace(/\s/g, '');
        // Корректное декодирование UTF-8 из base64
        const binary = atob(clean);
        content = decodeURIComponent(escape(binary));
    } catch (e) {
        throw new Error('Файл models.json повреждён (ошибка декодирования)');
    }

    let models;
    try {
        models = JSON.parse(content);
    } catch (e) {
        throw new Error('Файл models.json содержит невалидный JSON');
    }

    if (!Array.isArray(models)) {
        throw new Error('Файл models.json должен содержать массив');
    }

    return { models, sha: data.sha };
}

/**
 * Сохраняет массив моделей в models.json.
 * Если sha=null — создаёт файл, иначе обновляет.
 */
async function saveModels(models, token, sha) {
    const json = JSON.stringify(models, null, 2);
    // UTF-8 → base64 (кросс-браузерный хак)
    const content = btoa(unescape(encodeURIComponent(json)));

    const payload = {
        message: `Обновление каталога — ${new Date().toLocaleString('ru-RU')}`,
        content: content
    };
    if (sha) payload.sha = sha;

    const res = await fetch(
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

    if (res.status === 401) {
        throw new Error('401: Неправильный GitHub токен при сохранении');
    }
    if (res.status === 409) {
        throw new Error('409: Конфликт версий. Файл был изменён в другом месте. Обновите страницу и попробуйте снова.');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${err.message || 'Ошибка сохранения на GitHub'}`);
    }
    return await res.json();
}

/**
 * Загружает бинарный файл в папку assets репозитория.
 * Возвращает raw-URL для использования на сайте.
 */
async function uploadFile(file, folder, token) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${safeName}`;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target.result.split(',')[1];

                const res = await fetch(
                    `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify({
                            message: `Upload ${file.name}`,
                            content: base64
                        })
                    }
                );

                if (res.status === 401) throw new Error('401: Неправильный токен при загрузке файла');
                if (res.status === 422) throw new Error('422: Файл слишком большой или неверный формат');
                if (!res.ok) throw new Error(`${res.status}: Ошибка загрузки файла ${file.name}`);

                // Raw-URL для прямого доступа через GitHub Pages / raw
                const rawUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/${path}`;
                resolve(rawUrl);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Не удалось прочитать файл с диска'));
        reader.readAsDataURL(file);
    });
}

/* ---------- Загрузка и отрисовка моделей ---------- */

async function loadModels() {
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) {
        showMessage('⚠️ Вставь токен в поле выше');
        return;
    }

    showMessage('⏳ Загружаю список моделей...');

    try {
        const { models } = await getModelsAndSha(token);

        if (models.length === 0) {
            showMessage('📭 Пока нет моделей');
            return;
        }

        renderModels(models);
    } catch (err) {
        console.error('[Admin] Ошибка загрузки:', err);
        showMessage(`❌ ${err.message}`);
    }
}

function renderModels(models) {
    if (!modelsContainer) return;
    if (modelsCount) modelsCount.textContent = models.length;

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;">';

    models.forEach(model => {
        const photo = model.photo || 'https://via.placeholder.com/400x300/0a0a12/00d4ff?text=3D';
        const name  = model.name  || 'Без названия';
        const price = model.price || '0 ₽';
        const id    = model.id    || Math.random().toString(36).slice(2);

        html += `
            <div style="background:rgba(255,255,255,0.03);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);transition:transform 0.2s;">
                <img src="${photo}" alt="${escapeHtml(name)}"
                     style="width:100%;height:200px;object-fit:cover;background:#0a0a12;display:block;"
                     onerror="this.src='https://via.placeholder.com/400x200/0a0a12/00d4ff?text=3D'" />
                <div style="padding:14px 16px 18px;">
                    <h4 style="font-size:16px;font-weight:600;color:#fff;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</h4>
                    <div style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7b2ffc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 12px;">${escapeHtml(price)}</div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="window.viewModel('${id}')" style="flex:1;padding:8px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.1);border-radius:8px;color:#00d4ff;cursor:pointer;font-weight:600;">👁️</button>
                        <button onclick="window.deleteModel('${id}')" style="flex:1;padding:8px;background:rgba(255,51,102,0.08);border:1px solid rgba(255,51,102,0.1);border-radius:8px;color:#ff3366;cursor:pointer;font-weight:600;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    modelsContainer.innerHTML = html;
}

/* ---------- Просмотр / Удаление ---------- */

async function viewModel(id) {
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { alert('Вставь токен в поле выше'); return; }

    try {
        const { models } = await getModelsAndSha(token);
        const model = models.find(m => m.id === id);
        if (!model) { alert('Модель не найдена'); return; }

        let modal = document.getElementById('viewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewModal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:720px;">
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
        const gallery = model.gallery || [];

        let html = `
            <h2 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 2px;">${escapeHtml(model.name)}</h2>
            <div style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7b2ffc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:4px 0 16px;">${escapeHtml(model.price)}</div>
        `;

        if (model.photo) {
            html += `<img src="${model.photo}" style="width:100%;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:12px;background:#0a0a12;" onerror="this.style.display='none'" />`;
        }
        if (model.video) {
            html += `<video controls style="width:100%;border-radius:12px;margin:12px 0;background:#0a0a12;border:1px solid rgba(255,255,255,0.06);"><source src="${model.video}" type="video/mp4" /></video>`;
        }
        if (gallery.length) {
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin:12px 0;">`;
            gallery.forEach(url => {
                html += `<img src="${url}" style="width:100%;border-radius:8px;aspect-ratio:1;object-fit:cover;border:1px solid rgba(255,255,255,0.06);cursor:pointer;" onclick="window.open('${url}')" onerror="this.style.display='none'" />`;
            });
            html += `</div>`;
        }

        html += `<div style="color:#aaa;line-height:1.8;background:rgba(255,255,255,0.02);padding:16px 20px;border-radius:12px;border-left:3px solid #00d4ff;">${escapeHtml(model.description || 'Описание отсутствует')}</div>`;

        body.innerHTML = html;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        alert('Ошибка просмотра: ' + err.message);
    }
}

async function deleteModel(id) {
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { alert('Вставь токен в поле выше'); return; }
    if (!confirm('🗑️ Удалить эту модель?')) return;

    try {
        const { models, sha } = await getModelsAndSha(token);
        const deleted = models.find(m => m.id === id);
        const updated = models.filter(m => m.id !== id);

        await saveModels(updated, token, sha);
        await loadModels();
        showStatus('success', `🗑️ Модель «${deleted ? deleted.name : ''}» удалена`);
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

/* ---------- Drag & Drop ---------- */

function setupDropZone(zone, input, type) {
    if (!zone || !input) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        zone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(ev => {
        zone.addEventListener(ev, () => zone.classList.add('drag-over'), false);
    });
    ['dragleave', 'drop'].forEach(ev => {
        zone.addEventListener(ev, () => zone.classList.remove('drag-over'), false);
    });

    zone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (!files.length) return;
        if (type === 'gallery') {
            input.files = files;
            handleGallerySelect(files);
        } else {
            input.files = files;
            handleFileSelect(type, files[0]);
        }
        updateCardPreview();
    });

    input.addEventListener('change', (e) => {
        if (type === 'gallery') {
            handleGallerySelect(e.target.files);
        } else if (e.target.files.length) {
            handleFileSelect(type, e.target.files[0]);
        }
        updateCardPreview();
    });
}

function handleFileSelect(type, file) {
    currentFiles[type] = file;
    const el = type === 'photo' ? photoPreview : videoPreview;
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = `
        <div class="preview-item">
            <span>${escapeHtml(file.name)}</span>
            <span class="remove-file" onclick="window.removeFile('${type}')" style="cursor:pointer;color:#ff3366;font-weight:700;">✕</span>
        </div>
    `;
}

function handleGallerySelect(files) {
    currentFiles.gallery = Array.from(files);
    if (!galleryPreview) return;
    galleryPreview.classList.remove('hidden');
    let html = '';
    currentFiles.gallery.forEach((file, idx) => {
        html += `
            <div class="preview-item">
                <span>${escapeHtml(file.name)}</span>
                <span class="remove-file" onclick="window.removeGalleryFile(${idx})" style="cursor:pointer;color:#ff3366;font-weight:700;">✕</span>
            </div>
        `;
    });
    galleryPreview.innerHTML = html;
}

function removeFile(type) {
    currentFiles[type] = null;
    const input = type === 'photo' ? photoInput : videoInput;
    const preview = type === 'photo' ? photoPreview : videoPreview;
    if (input) input.value = '';
    if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
    updateCardPreview();
}

function removeGalleryFile(index) {
    currentFiles.gallery.splice(index, 1);
    if (galleryInput) galleryInput.value = '';
    handleGallerySelect(currentFiles.gallery);
    updateCardPreview();
}

/* ---------- Превью карточки (Live) ---------- */

function updateCardPreview() {
    if (!cardPreview) return;

    const name  = nameInput  ? nameInput.value.trim()  : '';
    const price = priceInput ? priceInput.value.trim() : '';
    const photo = currentFiles.photo;

    if (!name && !price && !photo) {
        cardPreview.innerHTML = `
            <div class="preview-empty">
                <span>◈</span>
                <p>Заполни форму<br>чтобы увидеть превью</p>
            </div>
        `;
        return;
    }

    const photoUrl = photo ? URL.createObjectURL(photo) : 'https://via.placeholder.com/400x300/0a0a12/00d4ff?text=3D';

    cardPreview.innerHTML = `
        <div class="preview-card-mini">
            <div class="card-image">
                <img src="${photoUrl}" alt="preview" style="width:100%;height:100%;object-fit:cover;" onload="if(this.src.startsWith('blob:'))URL.revokeObjectURL(this.src)" />
            </div>
            <div class="card-info">
                <div class="card-tag">3D MODEL</div>
                <h3>${escapeHtml(name) || 'Название'}</h3>
                <div class="price">${price ? escapeHtml(formatPrice(price)) : '0 ₽'}</div>
                <div class="card-line"></div>
            </div>
        </div>
    `;
}

/* ---------- Отправка формы (ДОБАВЛЕНИЕ модели) ---------- */

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { showStatus('error', 'Вставь GitHub токен'); return; }

    const name  = nameInput.value.trim();
    const price = priceInput.value.trim();
    const desc  = descInput.value.trim();

    if (!name || !price) { showStatus('error', 'Заполните название и цену'); return; }
    if (!currentFiles.photo) { showStatus('error', 'Добавьте главное фото'); return; }

    submitBtn.disabled = true;
    showStatus('loading', 'Загрузка файлов на GitHub...');
    setProgress(5, 'Начинаем...');

    try {
        // 1. Загружаем фото
        setProgress(15, 'Загрузка фото...');
        const photoUrl = await uploadFile(currentFiles.photo, CONFIG.assetsPath, token);

        // 2. Загружаем видео (если есть)
        let videoUrl = '';
        if (currentFiles.video) {
            setProgress(35, 'Загрузка видео...');
            videoUrl = await uploadFile(currentFiles.video, CONFIG.assetsPath, token);
        }

        // 3. Загружаем галерею (если есть)
        let galleryUrls = [];
        if (currentFiles.gallery.length) {
            for (let i = 0; i < currentFiles.gallery.length; i++) {
                setProgress(50 + Math.floor((i / currentFiles.gallery.length) * 30), `Галерея ${i+1}/${currentFiles.gallery.length}`);
                const url = await uploadFile(currentFiles.gallery[i], CONFIG.assetsPath, token);
                galleryUrls.push(url);
            }
        }

        // 4. Читаем текущий каталог (один запрос = данные + SHA)
        setProgress(85, 'Чтение каталога...');
        const { models, sha } = await getModelsAndSha(token);

        // 5. Формируем новую модель
        const newModel = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name,
            price: formatPrice(price),
            description: desc,
            photo: photoUrl,
            video: videoUrl,
            gallery: galleryUrls,
            createdAt: new Date().toISOString()
        };

        // 6. ДОБАВЛЯЕМ к существующим (не заменяем!)
        models.unshift(newModel);

        // 7. Сохраняем
        setProgress(95, 'Сохранение каталога...');
        await saveModels(models, token, sha);
        setProgress(100, 'Готово!');

        showStatus('success', `✅ Модель «${name}» добавлена!`);

        // Сброс
        uploadForm.reset();
        currentFiles = { photo: null, video: null, gallery: [] };
        [photoPreview, videoPreview, galleryPreview].forEach(el => {
            if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
        });
        updateCardPreview();
        await loadModels();

    } catch (err) {
        console.error('[Upload]', err);
        showStatus('error', err.message);
        setProgress(0, 'Ошибка');
    } finally {
        submitBtn.disabled = false;
    }
});

/* ---------- Предпросмотр витрины ---------- */

if (previewBtn) {
    previewBtn.addEventListener('click', async () => {
        const token = tokenInput ? tokenInput.value.trim() : '';
        if (!token) { alert('Вставь токен для предпросмотра'); return; }

        try {
            const { models } = await getModelsAndSha(token);
            if (!previewContainer) return;

            if (!models.length) {
                previewContainer.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.2);">Нет моделей</div>';
            } else {
                let html = '';
                models.forEach(m => {
                    html += `
                        <div class="preview-card">
                            <img src="${m.photo || ''}" alt="" onerror="this.src='https://via.placeholder.com/300x300/0a0a12/00d4ff?text=3D'" />
                            <div class="info">
                                <h4>${escapeHtml(m.name)}</h4>
                                <div class="price">${escapeHtml(m.price)}</div>
                            </div>
                        </div>
                    `;
                });
                previewContainer.innerHTML = html;
            }
            previewModal.classList.remove('hidden');
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });
}

if (previewClose && previewModal) {
    previewClose.addEventListener('click', () => previewModal.classList.add('hidden'));
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) previewModal.classList.add('hidden');
    });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
    // Drag & Drop
    setupDropZone(photoDrop,  photoInput,  'photo');
    setupDropZone(videoDrop,  videoInput,  'video');
    setupDropZone(galleryDrop, galleryInput, 'gallery');

    // Live-обновление превью карточки
    [nameInput, priceInput, descInput].forEach(el => {
        if (el) el.addEventListener('input', updateCardPreview);
    });

    // 1. Автозагрузка при старте, если токен уже вставлен
    if (tokenInput && tokenInput.value.trim()) {
        loadModels();
    } else {
        showMessage('⚠️ Вставь токен в поле выше');
    }

    // 2. Автообновление при вводе / вставке токена (debounce 500 мс)
    if (tokenInput) {
        tokenInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadModels, 500);
        });
    }

    // 3. Кнопка «Обновить список»
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadModels);
    }
});

/* Глобальные ссылки для inline-обработчиков */
window.viewModel = viewModel;
window.deleteModel = deleteModel;
window.removeFile = removeFile;
window.removeGalleryFile = removeGalleryFile;
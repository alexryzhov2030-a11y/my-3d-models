// ===== ТОКЕН БЕРЁМ ИЗ ПОЛЯ ВВОДА =====
const REPO_OWNER = 'alexryzhov2030-a11y';
const REPO_NAME = 'my-3d-models';
const FILE_PATH = 'models.json';

document.addEventListener('DOMContentLoaded', () => {
    loadModels();

    const form = document.getElementById('uploadForm');
    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const previewBtn = document.getElementById('previewBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const previewModal = document.getElementById('previewModal');
    const previewClose = document.getElementById('previewClose');
    const previewContainer = document.getElementById('previewContainer');
    const tokenInput = document.getElementById('tokenInput');

    const filesStore = {
        photo: null,
        video: null,
        gallery: []
    };

    // === ЖИВОЕ ПРЕВЬЮ ===
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const previewContainerEl = document.getElementById('cardPreview');

    function updateCardPreview() {
        const name = nameInput.value.trim() || 'Название модели';
        const price = priceInput.value.trim() || '0';
        const photoFile = filesStore.photo;

        let photoUrl = 'https://via.placeholder.com/400/0a0a12/00d4ff?text=3D';

        if (photoFile && photoFile instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoUrl = e.target.result;
                renderPreviewCard(name, price, photoUrl);
            };
            reader.readAsDataURL(photoFile);
        } else {
            renderPreviewCard(name, price, photoUrl);
        }
    }

    function renderPreviewCard(name, price, photoUrl) {
        previewContainerEl.innerHTML = `
            <div class="preview-card-mini">
                <div class="card-image">
                    <img src="${photoUrl}" alt="${name}" onerror="this.src='https://via.placeholder.com/400/0a0a12/00d4ff?text=3D'" />
                </div>
                <div class="card-info">
                    <div class="card-tag">Модель</div>
                    <h3>${name}</h3>
                    <div class="price">${price} ₽</div>
                    <div class="card-line"></div>
                </div>
            </div>
        `;
    }

    nameInput.addEventListener('input', updateCardPreview);
    priceInput.addEventListener('input', updateCardPreview);
    updateCardPreview();

    // === DRAG & DROP ===
    setupDropZone('photoDrop', 'photo', 'photoPreview', (files) => {
        const file = files[0];
        if (file && file instanceof File) {
            filesStore.photo = file;
            showFilePreview('photoPreview', [file], 'photo');
            updateCardPreview();
        }
    });

    setupDropZone('videoDrop', 'video', 'videoPreview', (files) => {
        const file = files[0];
        if (file && file instanceof File) {
            filesStore.video = file;
            showFilePreview('videoPreview', [file], 'video');
        }
    });

    setupDropZone('galleryDrop', 'gallery', 'galleryPreview', (files) => {
        filesStore.gallery = [];
        for (let f of files) {
            if (f instanceof File) {
                filesStore.gallery.push(f);
            }
        }
        if (filesStore.gallery.length > 0) {
            showFilePreview('galleryPreview', filesStore.gallery, 'gallery');
        } else {
            document.getElementById('galleryPreview').classList.add('hidden');
        }
    });

    function setupDropZone(dropId, inputId, previewId, onFiles) {
        const dropZone = document.getElementById(dropId);
        const input = document.getElementById(inputId);

        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                input.click();
            }
        });

        input.addEventListener('change', () => {
            if (input.files && input.files.length > 0) {
                const files = Array.from(input.files);
                onFiles(files);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const fileArray = Array.from(files);
                onFiles(fileArray);
                const dt = new DataTransfer();
                for (let f of fileArray) {
                    if (f instanceof File) {
                        dt.items.add(f);
                    }
                }
                input.files = dt.files;
            }
        });
    }

    function showFilePreview(previewId, files, type) {
        const container = document.getElementById(previewId);
        container.classList.remove('hidden');
        container.innerHTML = '';

        const validFiles = files.filter(f => f instanceof File);
        if (validFiles.length === 0) {
            container.classList.add('hidden');
            return;
        }

        validFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            let icon = '📄';
            if (file.type && file.type.startsWith('image/')) icon = '🖼️';
            if (file.type && file.type.startsWith('video/')) icon = '🎬';
            const sizeKB = (file.size / 1024).toFixed(1);
            item.innerHTML = `
                ${icon} ${file.name} (${sizeKB} KB)
                <span class="remove-file" data-type="${type}" data-index="${index}">✕</span>
            `;
            const removeBtn = item.querySelector('.remove-file');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (type === 'photo') {
                    filesStore.photo = null;
                    document.getElementById('photo').value = '';
                    container.classList.add('hidden');
                    updateCardPreview();
                } else if (type === 'video') {
                    filesStore.video = null;
                    document.getElementById('video').value = '';
                    container.classList.add('hidden');
                } else if (type === 'gallery') {
                    if (index < filesStore.gallery.length) {
                        filesStore.gallery.splice(index, 1);
                    }
                    if (filesStore.gallery.length === 0) {
                        container.classList.add('hidden');
                        document.getElementById('gallery').value = '';
                    } else {
                        showFilePreview(previewId, filesStore.gallery, 'gallery');
                    }
                    const dt = new DataTransfer();
                    for (let f of filesStore.gallery) {
                        if (f instanceof File) {
                            dt.items.add(f);
                        }
                    }
                    document.getElementById('gallery').files = dt.files;
                }
            });
            container.appendChild(item);
        });
    }

    // === ОТПРАВКА (ДОБАВЛЯЕТ, А НЕ ЗАМЕНЯЕТ) ===
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Заливка...';

        status.className = '';
        status.style.display = 'none';
        progressBar.classList.remove('hidden');
        updateProgress(0, 'Начинаем...');

        // Берём токен из поля ввода
        const GITHUB_TOKEN = tokenInput.value.trim();

        if (!GITHUB_TOKEN) {
            showStatus('error', '❌ Вставь GitHub токен в поле выше!');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Залить на сайт';
            progressBar.classList.add('hidden');
            return;
        }

        const name = document.getElementById('name').value.trim();
        const price = document.getElementById('price').value.trim();
        const description = document.getElementById('description').value.trim();

        if (!name || !price || !filesStore.photo) {
            showStatus('error', '❌ Заполни название, цену и выбери главное фото!');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Залить на сайт';
            progressBar.classList.add('hidden');
            return;
        }

        if (!/^\d+$/.test(price)) {
            showStatus('error', '❌ Цена должна содержать только цифры!');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Залить на сайт';
            progressBar.classList.add('hidden');
            return;
        }

        try {
            updateProgress(10, 'Читаем файлы...');

            if (!(filesStore.photo instanceof File)) throw new Error('Главное фото не является файлом');
            const photoData = await fileToBase64(filesStore.photo);
            
            updateProgress(30, 'Обрабатываем видео...');

            let videoData = '';
            if (filesStore.video) {
                if (!(filesStore.video instanceof File)) throw new Error('Видео не является файлом');
                videoData = await fileToBase64(filesStore.video);
            }

            updateProgress(50, 'Обрабатываем галерею...');

            const galleryData = [];
            for (let f of filesStore.gallery) {
                if (f instanceof File) {
                    galleryData.push(await fileToBase64(f));
                }
            }

            updateProgress(70, 'Собираем модель...');

            const newModel = {
                id: Date.now().toString(),
                name: name,
                price: price + ' ₽',
                description: description,
                photo: photoData,
                video: videoData,
                gallery: galleryData
            };

            // ===== ГЛАВНОЕ: ЗАГРУЖАЕМ СТАРЫЕ И ДОБАВЛЯЕМ НОВУЮ =====
            updateProgress(80, 'Загружаем текущие модели...');
            let models = await getModelsFromGitHub(GITHUB_TOKEN);
            
            // Если models не массив или пустой — создаём новый
            if (!Array.isArray(models)) {
                models = [];
            }
            
            // ДОБАВЛЯЕМ новую модель в конец списка (НЕ ЗАМЕНЯЕМ!)
            models.push(newModel);
            
            console.log('Всего моделей после добавления:', models.length);

            updateProgress(90, 'Заливаем на GitHub...');
            await saveModelsToGitHub(models, GITHUB_TOKEN);

            updateProgress(100, '✅ Готово!');

            showStatus('success', `✅ Модель "${name}" добавлена к существующим! Всего моделей: ${models.length}`);

            form.reset();
            filesStore.photo = null;
            filesStore.video = null;
            filesStore.gallery = [];
            document.querySelectorAll('.file-preview').forEach(el => el.classList.add('hidden'));
            updateCardPreview();
            loadModels();

            setTimeout(() => {
                progressBar.classList.add('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Залить на сайт';
            }, 3000);

        } catch (error) {
            console.error('Ошибка:', error);
            showStatus('error', '❌ Ошибка: ' + error.message);
            progressBar.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Залить на сайт';
        }
    });

    // === GITHUB API ===
    async function getModelsFromGitHub(token) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.status === 404) {
                console.log('Файл models.json не найден, создаём новый');
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`GitHub API ошибка: ${response.status}`);
            }

            const data = await response.json();
            const content = atob(data.content);
            const parsed = JSON.parse(content);
            
            // Убеждаемся что это массив
            if (!Array.isArray(parsed)) {
                console.warn('models.json не является массивом, создаём новый');
                return [];
            }
            
            return parsed;
        } catch (error) {
            console.error('Ошибка загрузки с GitHub:', error);
            return [];
        }
    }

    async function saveModelsToGitHub(models, token) {
        // Проверяем что models — это массив
        if (!Array.isArray(models)) {
            throw new Error('models должен быть массивом');
        }
        
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(models, null, 2))));
        
        let sha = null;
        try {
            const response = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch (e) {
            console.log('Файл ещё не существует, создаём новый');
        }

        const payload = {
            message: `Добавлена модель ${new Date().toLocaleString()}`,
            content: content,
            sha: sha
        };

        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
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
            const errorData = await response.json();
            throw new Error(`GitHub API ошибка: ${response.status} - ${errorData.message || 'Неизвестная ошибка'}`);
        }

        return await response.json();
    }

    function updateProgress(percent, text) {
        progressFill.style.width = percent + '%';
        progressText.textContent = text + ' (' + percent + '%)';
    }

    // === ПРЕДПРОСМОТР ВИТРИНЫ ===
    previewBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token) {
            showStatus('error', '❌ Сначала вставь токен в поле выше!');
            return;
        }
        try {
            const models = await getModelsFromGitHub(token);
            if (!models || models.length === 0) {
                previewContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.05);"><h3>📭 Нет моделей</h3></div>`;
            } else {
                previewContainer.innerHTML = models.map(model => `
                    <div class="preview-card">
                        <img src="${model.photo || 'https://via.placeholder.com/400/0a0a12/00d4ff?text=3D'}" alt="${model.name}" onerror="this.src='https://via.placeholder.com/400/0a0a12/00d4ff?text=3D'" />
                        <div class="info">
                            <h4>${model.name}</h4>
                            <div class="price">${model.price}</div>
                        </div>
                    </div>
                `).join('');
            }
            previewModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            showStatus('error', '❌ Ошибка загрузки для предпросмотра');
        }
    });

    previewClose.addEventListener('click', () => {
        previewModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });

    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });

    refreshBtn.addEventListener('click', () => {
        loadModels();
        showStatus('success', '🔄 Список обновлен!');
        setTimeout(() => { status.style.display = 'none'; }, 2000);
    });
});

// === ВСПОМОГАТЕЛЬНЫЕ ===
function showStatus(type, message) {
    const status = document.getElementById('status');
    status.className = type;
    status.textContent = message;
    status.style.display = 'block';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!(file instanceof File) && !(file instanceof Blob)) {
            reject('Аргумент должен быть File или Blob');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject('Не удалось прочитать файл: ' + err.message);
        reader.readAsDataURL(file);
    });
}

async function loadModels() {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!token) {
        document.getElementById('modelsList').innerHTML = `<div class="empty-state"><h3>⚠️ Вставь токен в поле выше</h3></div>`;
        return;
    }

    try {
        let models = await getModelsFromGitHub(token);
        if (!Array.isArray(models)) models = [];

        const container = document.getElementById('modelsList');
        const count = document.getElementById('modelsCount');
        count.textContent = models.length;

        if (models.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>📭 Пока нет моделей</h3></div>`;
            return;
        }

        container.innerHTML = models.map((model) => `
            <div class="model-item">
                <div class="info">
                    <img src="${model.photo || 'https://via.placeholder.com/36/0a0a12/00d4ff?text=3D'}" 
                         class="thumb" 
                         alt="${model.name}"
                         onerror="this.src='https://via.placeholder.com/36/0a0a12/00d4ff?text=3D'" />
                    <span class="name">${model.name}</span>
                    <span class="price">${model.price}</span>
                </div>
                <div class="actions">
                    <button onclick="viewModel('${model.id}')">👁️</button>
                    <button class="delete-btn" onclick="deleteModel('${model.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        document.getElementById('modelsList').innerHTML = `<div class="empty-state"><h3>⚠️ Ошибка загрузки</h3></div>`;
    }
}

async function viewModel(id) {
    const tokenInput = document.getElementById('tokenInput');
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
            galleryHtml = `<div class="gallery">`;
            model.gallery.forEach(img => {
                galleryHtml += `<img src="${img}" alt="Фото" loading="lazy" onerror="this.style.display='none'" />`;
            });
            galleryHtml += `</div>`;
        }
        let videoHtml = '';
        if (model.video) {
            videoHtml = `<video controls><source src="${model.video}" type="video/mp4" />Ваш браузер не поддерживает видео</video>`;
        }

        body.innerHTML = `
            <h2>${model.name}</h2>
            <div class="price">${model.price}</div>
            ${videoHtml}
            ${galleryHtml}
            <div class="description">${model.description || 'Описание отсутствует'}</div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        alert('Ошибка просмотра: ' + error.message);
    }
}

async function deleteModel(id) {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) { alert('Вставь токен в поле выше'); return; }
    if (!confirm('🗑️ Удалить эту модель?')) return;

    try {
        let models = await getModelsFromGitHub(token);
        if (!Array.isArray(models)) models = [];
        const deleted = models.find(m => m.id === id);
        models = models.filter(m => m.id !== id);
        await saveModelsToGitHub(models, token);
        loadModels();
        showStatus('success', `🗑️ Модель "${deleted ? deleted.name : ''}" удалена!`);
        setTimeout(() => { document.getElementById('status').style.display = 'none'; }, 3000);
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

window.viewModel = viewModel;
window.deleteModel = deleteModel;
window.getModelsFromGitHub = getModelsFromGitHub;
document.addEventListener('DOMContentLoaded', () => {
    loadModels();

    const form = document.getElementById('uploadForm');
    const status = document.getElementById('status');
    const previewBtn = document.getElementById('previewBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const previewModal = document.getElementById('previewModal');
    const previewClose = document.getElementById('previewClose');
    const previewContainer = document.getElementById('previewContainer');

    // Хранилище выбранных файлов
    const filesStore = {
        photo: null,
        video: null,
        gallery: []
    };

    // === DRAG & DROP ===
    setupDropZone('photoDrop', 'photo', 'photoPreview', (file) => {
        filesStore.photo = file;
        showFilePreview('photoPreview', [file], 'photo');
    });

    setupDropZone('videoDrop', 'video', 'videoPreview', (file) => {
        filesStore.video = file;
        showFilePreview('videoPreview', [file], 'video');
    });

    setupDropZone('galleryDrop', 'gallery', 'galleryPreview', (files) => {
        filesStore.gallery = Array.from(files);
        showFilePreview('galleryPreview', filesStore.gallery, 'gallery');
    });

    // === ФУНКЦИЯ НАСТРОЙКИ DROP ZONE ===
    function setupDropZone(dropId, inputId, previewId, onFiles) {
        const dropZone = document.getElementById(dropId);
        const input = document.getElementById(inputId);

        // Нажатие на зону = клик по input
        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                input.click();
            }
        });

        // Выбор файлов через input
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                onFiles(input.files);
            }
        });

        // Drag & Drop события
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
            if (files.length > 0) {
                onFiles(files);
                // Синхронизируем input
                const dt = new DataTransfer();
                for (let f of files) dt.items.add(f);
                input.files = dt.files;
            }
        });
    }

    // === ПОКАЗ ПРЕВЬЮ ФАЙЛОВ ===
    function showFilePreview(previewId, files, type) {
        const container = document.getElementById(previewId);
        container.classList.remove('hidden');
        container.innerHTML = '';

        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';

            let icon = '📄';
            if (file.type.startsWith('image/')) icon = '🖼️';
            if (file.type.startsWith('video/')) icon = '🎬';

            item.innerHTML = `
                ${icon} ${file.name} (${(file.size / 1024).toFixed(1)} KB)
                <span class="remove-file" data-type="${type}" data-index="${index}">✕</span>
            `;

            const removeBtn = item.querySelector('.remove-file');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (type === 'photo') {
                    filesStore.photo = null;
                    document.getElementById('photo').value = '';
                    container.classList.add('hidden');
                } else if (type === 'video') {
                    filesStore.video = null;
                    document.getElementById('video').value = '';
                    container.classList.add('hidden');
                } else if (type === 'gallery') {
                    filesStore.gallery.splice(index, 1);
                    if (filesStore.gallery.length === 0) {
                        container.classList.add('hidden');
                    } else {
                        showFilePreview(previewId, filesStore.gallery, 'gallery');
                    }
                    // Синхронизируем input
                    const dt = new DataTransfer();
                    for (let f of filesStore.gallery) dt.items.add(f);
                    document.getElementById('gallery').files = dt.files;
                }
            });

            container.appendChild(item);
        });
    }

    // === ОТПРАВКА ФОРМЫ ===
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = '';
        status.style.display = 'none';
        status.textContent = '';

        const name = document.getElementById('name').value.trim();
        const price = document.getElementById('price').value.trim();
        const description = document.getElementById('description').value.trim();

        if (!name || !price || !filesStore.photo) {
            showStatus('error', '❌ Заполни название, цену и выбери главное фото!');
            return;
        }

        if (!/^\d+$/.test(price)) {
            showStatus('error', '❌ Цена должна содержать только цифры!');
            return;
        }

        try {
            showStatus('loading', '⏳ Загрузка файлов...');

            const photoData = await fileToBase64(filesStore.photo);
            
            let videoData = '';
            if (filesStore.video) {
                videoData = await fileToBase64(filesStore.video);
            }

            const galleryData = [];
            for (let f of filesStore.gallery) {
                galleryData.push(await fileToBase64(f));
            }

            const newModel = {
                id: Date.now().toString(),
                name: name,
                price: price + ' ₽',
                description: description,
                photo: photoData,
                video: videoData,
                gallery: galleryData
            };

            // Загружаем текущие модели
            const response = await fetch('models.json?t=' + Date.now());
            let models = await response.json();
            if (!Array.isArray(models)) models = [];

            models.push(newModel);

            // Скачиваем обновленный файл
            downloadJSON(models);

            showStatus('success', `✅ Модель "${name}" добавлена! Файл models.json скачан.`);

            form.reset();
            filesStore.photo = null;
            filesStore.video = null;
            filesStore.gallery = [];
            document.querySelectorAll('.file-preview').forEach(el => el.classList.add('hidden'));
            loadModels();

        } catch (error) {
            showStatus('error', '❌ Ошибка: ' + error.message);
        }
    });

    // === ПРЕДПРОСМОТР ВИТРИНЫ ===
    previewBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('models.json?t=' + Date.now());
            const models = await response.json();
            
            if (!models || models.length === 0) {
                previewContainer.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:40px; color:#6a8aaa;">
                        <h3>📭 Нет моделей для предпросмотра</h3>
                    </div>
                `;
            } else {
                previewContainer.innerHTML = models.map(model => `
                    <div class="preview-card">
                        <img src="${model.photo || 'https://via.placeholder.com/400x240/0a1628/0077ff?text=3D+Model'}" 
                             alt="${model.name}" 
                             onerror="this.src='https://via.placeholder.com/400x240/0a1628/0077ff?text=Ошибка'" />
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

    // === ОБНОВЛЕНИЕ СПИСКА ===
    refreshBtn.addEventListener('click', () => {
        loadModels();
        showStatus('success', '🔄 Список обновлен!');
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    });
});

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function showStatus(type, message) {
    const status = document.getElementById('status');
    status.className = type;
    status.textContent = message;
    status.style.display = 'block';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject('Не удалось прочитать файл');
        reader.readAsDataURL(file);
    });
}

function downloadJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'models.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(
        '📥 Файл models.json скачан!\n\n' +
        'Теперь сделай:\n' +
        '1. Зайди на GitHub\n' +
        '2. Открой файл models.json\n' +
        '3. Нажми Edit (карандашик)\n' +
        '4. Удали всё и вставь новое содержимое\n' +
        '5. Нажми Commit changes\n\n' +
        'Через 10 секунд сайт обновится!'
    );
}

async function loadModels() {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        let models = await response.json();
        if (!Array.isArray(models)) models = [];

        const container = document.getElementById('modelsList');
        const count = document.getElementById('modelsCount');

        count.textContent = models.length;

        if (models.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📭 Пока нет моделей</h3>
                    <p>Добавь первую модель через форму выше</p>
                </div>
            `;
            return;
        }

        container.innerHTML = models.map((model, index) => `
            <div class="model-item">
                <div class="info">
                    <img src="${model.photo || 'https://via.placeholder.com/50/0a1628/0077ff?text=3D'}" 
                         class="thumb" 
                         alt="${model.name}"
                         onerror="this.src='https://via.placeholder.com/50/0a1628/0077ff?text=3D'" />
                    <span class="name">${model.name}</span>
                    <span class="price">${model.price}</span>
                </div>
                <div class="actions">
                    <button class="view-btn" onclick="viewModel('${model.id}')">👁️</button>
                    <button class="delete-btn" onclick="deleteModel('${model.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        document.getElementById('modelsList').innerHTML = `
            <div class="empty-state">
                <h3>⚠️ Ошибка загрузки</h3>
                <p>Не удалось загрузить список моделей</p>
            </div>
        `;
    }
}

// === ПРОСМОТР МОДЕЛИ ИЗ АДМИНКИ ===
async function viewModel(id) {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        let models = await response.json();
        if (!Array.isArray(models)) models = [];
        const model = models.find(m => m.id === id);
        
        if (!model) {
            alert('Модель не найдена');
            return;
        }

        const modalBody = document.getElementById('modal-body');
        if (!modalBody) {
            // Если на админке нет модалки — открываем в новой вкладке витрину
            window.open('index.html', '_blank');
            return;
        }

        // Используем ту же модалку что и на витрине
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

        // Создаем модалку если её нет
        let modal = document.getElementById('viewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewModal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" id="viewModalClose">&times;</span>
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

// === УДАЛЕНИЕ МОДЕЛИ ===
async function deleteModel(id) {
    if (!confirm('🗑️ Удалить эту модель?')) return;

    try {
        const response = await fetch('models.json?t=' + Date.now());
        let models = await response.json();
        if (!Array.isArray(models)) models = [];

        const deleted = models.find(m => m.id === id);
        models = models.filter(m => m.id !== id);
        
        downloadJSON(models);
        loadModels();
        
        showStatus('success', `🗑️ Модель "${deleted ? deleted.name : ''}" удалена! Скачался обновленный models.json.`);
        setTimeout(() => {
            status.style.display = 'none';
        }, 4000);
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}
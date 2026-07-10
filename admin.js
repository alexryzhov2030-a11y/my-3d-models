document.addEventListener('DOMContentLoaded', () => {
    loadModels();

    const form = document.getElementById('uploadForm');
    const status = document.getElementById('status');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = '';
        status.style.display = 'none';
        status.textContent = '';

        const name = document.getElementById('name').value.trim();
        const price = document.getElementById('price').value.trim();
        const description = document.getElementById('description').value.trim();
        const photo = document.getElementById('photo').value.trim();
        const video = document.getElementById('video').value.trim();
        const galleryRaw = document.getElementById('gallery').value.trim();

        if (!name || !price || !photo) {
            status.className = 'error';
            status.textContent = '❌ Заполни название, цену и главное фото!';
            status.style.display = 'block';
            return;
        }

        const gallery = galleryRaw ? galleryRaw.split(',').map(s => s.trim()).filter(s => s) : [];

        const newModel = {
            id: Date.now().toString(),
            name: name,
            price: price,
            description: description,
            photo: photo,
            video: video,
            gallery: gallery
        };

        try {
            // Загружаем текущие модели
            const response = await fetch('models.json?t=' + Date.now());
            let models = await response.json();

            if (!Array.isArray(models)) models = [];

            // Добавляем новую
            models.push(newModel);

            // Сохраняем обратно (через GitHub API)
            await saveToGitHub(models);

            status.className = 'success';
            status.textContent = '✅ Модель "' + name + '" добавлена!';
            status.style.display = 'block';

            form.reset();
            loadModels();

        } catch (error) {
            status.className = 'error';
            status.textContent = '❌ Ошибка: ' + error.message;
            status.style.display = 'block';
        }
    });
});

async function loadModels() {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        let models = await response.json();
        if (!Array.isArray(models)) models = [];

        const container = document.getElementById('modelsList');

        if (models.length === 0) {
            container.innerHTML = '<p style="color: #666;">Пока нет моделей. Добавь первую!</p>';
            return;
        }

        container.innerHTML = models.map(model => `
            <div class="model-item">
                <span class="name">${model.name}</span>
                <span class="price">${model.price}</span>
                <button class="delete" onclick="deleteModel('${model.id}')">✕</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
    }
}

async function deleteModel(id) {
    if (!confirm('Удалить модель?')) return;

    try {
        const response = await fetch('models.json?t=' + Date.now());
        let models = await response.json();
        if (!Array.isArray(models)) models = [];

        models = models.filter(m => m.id !== id);

        await saveToGitHub(models);
        loadModels();
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

async function saveToGitHub(models) {
    // Превращаем в JSON
    const json = JSON.stringify(models, null, 2);

    // Сохраняем в localStorage (для простоты)
    // В реальности нужно будет через GitHub API, но для начала используем localStorage
    localStorage.setItem('models', json);

    // Скачиваем файл для ручной загрузки
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'models.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Инструкция для пользователя
    alert('✅ Файл models.json скачан!\n\nТеперь сделай:\n1. Открой GitHub\n2. Зайди в свой репозиторий\n3. Нажми на models.json\n4. Нажми Edit\n5. Скопируй содержимое из скачанного файла\n6. Вставь и нажми Commit');
}
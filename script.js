const catalog = document.getElementById('catalog');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');

// Загружаем модели из JSON
async function loadModels() {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        const models = await response.json();
        renderCards(models);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        catalog.innerHTML = '<p style="color: #666; text-align: center;">Нет моделей. Добавь первую через админку.</p>';
    }
}

function renderCards(models) {
    catalog.innerHTML = '';
    if (!models || models.length === 0) {
        catalog.innerHTML = '<p style="color: #666; text-align: center;">Моделей пока нет</p>';
        return;
    }
    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${model.photo || 'https://via.placeholder.com/400x240?text=Нет+фото'}" 
                 alt="${model.name}" 
                 loading="lazy" 
                 onerror="this.src='https://via.placeholder.com/400x240?text=Ошибка+загрузки'" />
            <div class="card-info">
                <h3>${model.name}</h3>
                <div class="price">${model.price}</div>
            </div>
        `;
        card.addEventListener('click', () => openModal(model.id, models));
        catalog.appendChild(card);
    });
}

function openModal(id, models) {
    const model = models.find(m => m.id === id);
    if (!model) return;

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

    modalBody.innerHTML = `
        <h2>${model.name}</h2>
        <div class="price">${model.price}</div>
        ${videoHtml}
        ${galleryHtml}
        <div class="description">${model.description || 'Описание отсутствует'}</div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

loadModels();
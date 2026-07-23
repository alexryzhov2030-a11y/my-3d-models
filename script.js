const catalog = document.getElementById('catalog');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');

// Загрузка моделей
async function loadModels() {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        const models = await response.json();
        renderCards(models);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        catalog.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#6a8aaa;">
                <h2 style="color:#0a1628;">😕 Нет моделей</h2>
                <p>Добавь первую модель через <a href="admin.html" style="color:#0077ff;">админку</a></p>
            </div>
        `;
    }
}

function renderCards(models) {
    catalog.innerHTML = '';
    if (!models || models.length === 0) {
        catalog.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#6a8aaa;">
                <h2 style="color:#0a1628;">📦 Моделей пока нет</h2>
                <p>Добавь первую модель через <a href="admin.html" style="color:#0077ff;">админку</a></p>
            </div>
        `;
        return;
    }

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${model.photo || 'https://via.placeholder.com/400x240/0a1628/0077ff?text=3D+Model'}" 
                 alt="${model.name}" 
                 loading="lazy" 
                 onerror="this.src='https://via.placeholder.com/400x240/0a1628/0077ff?text=Ошибка'" />
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
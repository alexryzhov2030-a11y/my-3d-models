const catalog = document.getElementById('catalog');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');
const themeToggle = document.getElementById('themeToggle');

// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
}

// Загрузка сохранённой темы
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const icon = themeToggle.querySelector('.theme-icon');
icon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

themeToggle.addEventListener('click', toggleTheme);

// ===== ЗАГРУЗКА МОДЕЛЕЙ =====
async function loadModels() {
    try {
        const response = await fetch('models.json?t=' + Date.now());
        const models = await response.json();
        renderCards(models);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        catalog.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">
                <div style="font-size:40px; margin-bottom:16px;">◇</div>
                <h3 style="font-weight:400; color:var(--text-secondary);">Нет моделей</h3>
                <p style="font-size:14px; margin-top:4px; color:var(--text-muted);">
                    Добавь первую через <a href="admin.html" style="color:#00d4ff; text-decoration:none;">админку</a>
                </p>
            </div>
        `;
    }
}

function renderCards(models) {
    catalog.innerHTML = '';
    if (!models || models.length === 0) {
        catalog.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">
                <div style="font-size:40px; margin-bottom:16px;">◇</div>
                <h3 style="font-weight:400; color:var(--text-secondary);">Коллекция пуста</h3>
            </div>
        `;
        return;
    }

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-image">
                <img src="${model.photo || 'https://via.placeholder.com/400/0a0a12/00d4ff?text=3D'}" 
                     alt="${model.name}" 
                     loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/400/0a0a12/00d4ff?text=3D'" />
                <span class="badge">✦ 3D</span>
            </div>
            <div class="card-info">
                <div class="card-tag">Модель</div>
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

function closeModalFn() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

closeBtn.addEventListener('click', closeModalFn);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModalFn();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModalFn();
});

loadModels();
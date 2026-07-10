<?php
header('Content-Type: application/json');

// Папка с моделями
$modelsDir = __DIR__ . '/models/';

// Получаем данные из формы
$name = $_POST['name'] ?? '';
$price = $_POST['price'] ?? '';
$description = $_POST['description'] ?? '';

if (!$name || !$price) {
    echo json_encode(['success' => false, 'error' => 'Заполните название и цену']);
    exit;
}

// Создаем ID модели (транслит + уникальный номер)
$id = translit($name) . '_' . time();
$modelDir = $modelsDir . $id . '/';
$galleryDir = $modelDir . 'gallery/';

// Создаем папки
if (!is_dir($modelDir)) mkdir($modelDir, 0777, true);
if (!is_dir($galleryDir)) mkdir($galleryDir, 0777, true);

// Обрабатываем главное фото
$photoPath = '';
if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $photoPath = 'models/' . $id . '/photo.' . $ext;
    move_uploaded_file($_FILES['photo']['tmp_name'], __DIR__ . '/' . $photoPath);
}

// Обрабатываем видео
$videoPath = '';
if (isset($_FILES['video']) && $_FILES['video']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['video']['name'], PATHINFO_EXTENSION);
    $videoPath = 'models/' . $id . '/video.' . $ext;
    move_uploaded_file($_FILES['video']['tmp_name'], __DIR__ . '/' . $videoPath);
}

// Обрабатываем галерею (много фото)
$gallery = [];
if (isset($_FILES['gallery'])) {
    foreach ($_FILES['gallery']['tmp_name'] as $key => $tmp) {
        if ($_FILES['gallery']['error'][$key] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['gallery']['name'][$key], PATHINFO_EXTENSION);
            $galleryName = count($gallery) + 1 . '.' . $ext;
            $galleryPath = $galleryDir . $galleryName;
            move_uploaded_file($tmp, $galleryPath);
            $gallery[] = 'models/' . $id . '/gallery/' . $galleryName;
        }
    }
}

// Сохраняем data.json
$data = [
    'id' => $id,
    'name' => $name,
    'price' => $price,
    'description' => $description,
    'photo' => $photoPath,
    'video' => $videoPath,
    'gallery' => $gallery
];

file_put_contents($modelDir . 'data.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Обновляем общий список (models_list.json)
$listFile = __DIR__ . '/models_list.json';
$allModels = file_exists($listFile) ? json_decode(file_get_contents($listFile), true) : [];
$allModels[] = $data;
file_put_contents($listFile, json_encode($allModels, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['success' => true, 'id' => $id]);

// Функция транслита
function translit($text) {
    $rus = ['а','б','в','г','д','е','ё','ж','з','и','й','к','л','м','н','о','п','р','с','т','у','ф','х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я'];
    $lat = ['a','b','v','g','d','e','yo','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','c','ch','sh','sh','','y','','e','yu','ya'];
    $text = str_replace($rus, $lat, mb_strtolower($text));
    $text = preg_replace('/[^a-z0-9_-]/', '_', $text);
    return trim($text, '_');
}
?>
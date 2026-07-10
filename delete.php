<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? '';

if (!$id) {
    echo json_encode(['success' => false, 'error' => 'ID не указан']);
    exit;
}

// Удаляем папку модели
$modelPath = __DIR__ . '/models/' . $id . '/';
if (is_dir($modelPath)) {
    deleteDirectory($modelPath);
}

// Обновляем models_list.json
$listFile = __DIR__ . '/models_list.json';
if (file_exists($listFile)) {
    $allModels = json_decode(file_get_contents($listFile), true);
    $allModels = array_filter($allModels, function($model) use ($id) {
        return $model['id'] !== $id;
    });
    $allModels = array_values($allModels);
    file_put_contents($listFile, json_encode($allModels, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

echo json_encode(['success' => true]);

function deleteDirectory($dir) {
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        $path = $dir . $file;
        is_dir($path) ? deleteDirectory($path) : unlink($path);
    }
    rmdir($dir);
}
?>
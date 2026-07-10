<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$listFile = __DIR__ . '/models_list.json';
if (file_exists($listFile)) {
    echo file_get_contents($listFile);
} else {
    echo '[]';
}
?>
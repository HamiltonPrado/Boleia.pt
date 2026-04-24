<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');

session_init();
session_destroy();

json_out(['success' => true, 'message' => 'Sessão terminada']);

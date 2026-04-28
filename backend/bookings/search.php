<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$date      = $_GET['date']      ?? '';
$originLat = $_GET['originLat'] ?? null;
$originLng = $_GET['originLng'] ?? null;
$destLat   = $_GET['destLat']   ?? null;
$destLng   = $_GET['destLng']   ?? null;
$RADIUS_KM = 25;

if (!$date) json_out(['success' => false, 'message' => 'Data obrigatória'], 400);
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_out(['success' => false, 'message' => 'Formato de data inválido (YYYY-MM-DD)'], 400);

$db = db();

$sql = "SELECT ro.id AS occurrence_id, ro.date, ro.seats_taken,
               r.id AS route_id, r.total_seats, r.price_per_seat, r.depart_time, r.notes,
               u.id AS driver_id, u.full_name AS driver_name, u.avatar_url,
               dp.tier, dp.avg_rating, dp.total_trips, dp.car_make, dp.car_model, dp.car_year
        FROM route_occurrences ro
        INNER JOIN routes r ON ro.route_id = r.id
        INNER JOIN driver_profiles dp ON r.driver_id = dp.id
        INNER JOIN users u ON dp.user_id = u.id
        WHERE ro.date = ? AND ro.status = 'SCHEDULED' AND r.status = 'ACTIVE'
          AND (r.total_seats - ro.seats_taken) > 0";

$params = [$date];

if ($originLat && $originLng) {
    $sql .= " AND (SELECT (6371 * acos(GREATEST(-1, LEAST(1,
                cos(radians(?)) * cos(radians(rs_o.lat)) * cos(radians(rs_o.lng) - radians(?))
                + sin(radians(?)) * sin(radians(rs_o.lat))
              )))) FROM route_stops rs_o WHERE rs_o.route_id = r.id ORDER BY rs_o.stop_order ASC LIMIT 1) <= ?";
    array_push($params, $originLat, $originLng, $originLat, $RADIUS_KM);
}

if ($destLat && $destLng) {
    $sql .= " AND (SELECT (6371 * acos(GREATEST(-1, LEAST(1,
                cos(radians(?)) * cos(radians(rs_d.lat)) * cos(radians(rs_d.lng) - radians(?))
                + sin(radians(?)) * sin(radians(rs_d.lat))
              )))) FROM route_stops rs_d WHERE rs_d.route_id = r.id ORDER BY rs_d.stop_order DESC LIMIT 1) <= ?";
    array_push($params, $destLat, $destLng, $destLat, $RADIUS_KM);
}

$sql .= " ORDER BY r.depart_time ASC";

try {
    $st = $db->prepare($sql);
    $st->execute($params);
    $results = $st->fetchAll();

    if (!empty($results)) {
        $routeIds = array_unique(array_column($results, 'route_id'));
        $ph = implode(',', array_fill(0, count($routeIds), '?'));
        $ss = $db->prepare(
            "SELECT id, route_id, stop_order, label, address, lat, lng
             FROM route_stops WHERE route_id IN ($ph) ORDER BY route_id, stop_order ASC"
        );
        $ss->execute($routeIds);
        $stopsByRoute = [];
        foreach ($ss->fetchAll() as $s) {
            $stopsByRoute[$s['route_id']][] = $s;
        }
        foreach ($results as &$row) {
            $row['stops'] = json_encode($stopsByRoute[$row['route_id']] ?? []);
        }
        unset($row);
    }

    json_out(['success' => true, 'results' => $results]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => 'Erro na pesquisa: ' . $e->getMessage()], 500);
}

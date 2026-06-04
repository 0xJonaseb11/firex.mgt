-- TZW: select compliance and reports

SELECT * FROM v_compliance_snapshot;

SELECT * FROM v_upcoming_expirations;

SELECT 'inventory_total' AS metric, total_units::text AS value
FROM v_compliance_snapshot
UNION ALL
SELECT 'expired', expired_units::text FROM v_compliance_snapshot
UNION ALL
SELECT 'expiring_30d', expiring_within_30_days::text FROM v_compliance_snapshot
UNION ALL
SELECT 'needs_maintenance', needs_maintenance_units::text FROM v_compliance_snapshot
UNION ALL
SELECT 'inspections_pending', SUM(inspection_count)::text
FROM v_inspection_status_summary
WHERE status = 'scheduled'
UNION ALL
SELECT 'inspections_overdue', SUM(inspection_count)::text
FROM v_inspection_status_summary
WHERE status = 'overdue'
UNION ALL
SELECT 'inspections_completed', SUM(inspection_count)::text
FROM v_inspection_status_summary
WHERE status = 'completed';

SELECT 'pending' AS category, COALESCE(SUM(inspection_count), 0) AS count
FROM v_inspection_status_summary WHERE status = 'scheduled'
UNION ALL
SELECT 'completed', COALESCE(SUM(inspection_count), 0)
FROM v_inspection_status_summary WHERE status = 'completed'
UNION ALL
SELECT 'overdue', COALESCE(SUM(inspection_count), 0)
FROM v_inspection_status_summary WHERE status = 'overdue'
UNION ALL
SELECT 'cancelled', COALESCE(SUM(inspection_count), 0)
FROM v_inspection_status_summary WHERE status = 'cancelled';

SELECT status AS category, unit_count AS count
FROM v_extinguisher_status_summary;

SELECT type AS category, unit_count AS count
FROM v_extinguisher_type_summary;

SELECT
	(SELECT COUNT(*)::int FROM maintenance_logs) AS total_logs,
	(SELECT COUNT(*)::int FROM maintenance_logs
	 WHERE maintenance_date >= CURRENT_DATE - INTERVAL '30 days') AS last_30_days;

SELECT COUNT(*)::int AS registered_today
FROM fire_extinguishers
WHERE created_at::date = CURRENT_DATE;

SELECT COUNT(*)::int AS registrations_in_range
FROM fire_extinguishers
WHERE created_at::date BETWEEN '2026-01-01' AND '2026-12-31';

SELECT
	u.email,
	COUNT(i.id) FILTER (WHERE i.status = 'scheduled') AS my_scheduled,
	COUNT(i.id) FILTER (WHERE i.status = 'overdue') AS my_overdue,
	COUNT(i.id) FILTER (WHERE i.status = 'completed') AS my_completed
FROM users u
LEFT JOIN inspections i ON i.scheduled_by = u.id
WHERE u.email = 'user.demo@tzw.local'
GROUP BY u.email;

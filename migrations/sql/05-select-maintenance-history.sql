-- TZW: select maintenance

SELECT *
FROM v_maintenance_detail
ORDER BY maintenance_date DESC, created_at DESC;

SELECT *
FROM v_maintenance_detail
WHERE maintenance_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY maintenance_date DESC;

SELECT *
FROM v_maintenance_detail
WHERE serial_number = 'FE-001'
ORDER BY maintenance_date DESC;

SELECT *
FROM v_maintenance_detail
WHERE performed_by_name ILIKE '%inspector%'
ORDER BY maintenance_date DESC;

SELECT
	to_char(date_trunc('month', maintenance_date::timestamp), 'YYYY-MM') AS month,
	COUNT(*)::int AS log_count
FROM maintenance_logs
WHERE maintenance_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', maintenance_date::timestamp)
ORDER BY month;

SELECT
	COUNT(*)::int AS total_logs,
	COUNT(DISTINCT extinguisher_id)::int AS distinct_extinguishers,
	ROUND(
		COUNT(*)::numeric / NULLIF(COUNT(DISTINCT extinguisher_id), 0),
		2
	) AS avg_logs_per_extinguisher
FROM maintenance_logs;

SELECT fe.serial_number, fe.location, fe.status
FROM fire_extinguishers fe
LEFT JOIN maintenance_logs m ON m.extinguisher_id = fe.id
WHERE m.id IS NULL
ORDER BY fe.serial_number;

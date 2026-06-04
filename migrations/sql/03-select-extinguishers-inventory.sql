-- TZW: select extinguishers

SELECT
	fe.id,
	fe.serial_number,
	fe.location,
	fe.type,
	fe.size,
	fe.installation_date,
	fe.expiry_date,
	fe.status,
	fe.created_at,
	fe.updated_at,
	registrar.first_name || ' ' || registrar.last_name AS registered_by
FROM fire_extinguishers fe
JOIN users registrar ON registrar.id = fe.created_by
ORDER BY fe.serial_number;

SELECT *
FROM fire_extinguishers
WHERE serial_number = 'FE-001';

-- SELECT * FROM fire_extinguishers WHERE id = 'your_extinguisher_id_here';

SELECT * FROM v_extinguisher_status_summary;
SELECT * FROM v_extinguisher_type_summary;

SELECT serial_number, location, type, size, expiry_date
FROM fire_extinguishers
WHERE status = 'active'
ORDER BY location;

SELECT serial_number, location, expiry_date, status
FROM fire_extinguishers
WHERE status = 'expired'
   OR expiry_date < CURRENT_DATE
ORDER BY expiry_date;

SELECT serial_number, location, status, updated_at
FROM fire_extinguishers
WHERE status = 'needs_maintenance'
ORDER BY updated_at DESC;

SELECT serial_number, location, type, status
FROM fire_extinguishers
WHERE location ILIKE '%warehouse%'
ORDER BY serial_number;

SELECT
	to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
	COUNT(*)::int AS registrations
FROM fire_extinguishers
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day;

SELECT
	to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
	COUNT(*)::int AS registrations
FROM fire_extinguishers
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month;

SELECT
	to_char(date_trunc('year', created_at), 'YYYY') AS year,
	COUNT(*)::int AS registrations
FROM fire_extinguishers
GROUP BY date_trunc('year', created_at)
ORDER BY year;

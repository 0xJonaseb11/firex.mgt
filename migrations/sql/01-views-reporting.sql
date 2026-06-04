-- TZW: reporting views

CREATE OR REPLACE VIEW v_users_by_role AS
SELECT
	role,
	COUNT(*)::int AS user_count
FROM users
GROUP BY role
ORDER BY role;

CREATE OR REPLACE VIEW v_extinguisher_status_summary AS
SELECT
	status,
	COUNT(*)::int AS unit_count
FROM fire_extinguishers
GROUP BY status
ORDER BY unit_count DESC;

CREATE OR REPLACE VIEW v_extinguisher_type_summary AS
SELECT
	type,
	COUNT(*)::int AS unit_count
FROM fire_extinguishers
GROUP BY type
ORDER BY unit_count DESC;

CREATE OR REPLACE VIEW v_inspection_status_summary AS
SELECT
	status,
	COUNT(*)::int AS inspection_count
FROM inspections
GROUP BY status
ORDER BY inspection_count DESC;

CREATE OR REPLACE VIEW v_inspection_detail AS
SELECT
	i.id AS inspection_id,
	i.status,
	i.scheduled_date,
	i.scheduled_time,
	i.notes,
	i.cancel_reason,
	i.completed_at,
	fe.serial_number,
	fe.location,
	fe.type AS extinguisher_type,
	fe.status AS extinguisher_status,
	scheduler.first_name || ' ' || scheduler.last_name AS scheduled_by_name,
	scheduler.email AS scheduled_by_email,
	inspector.first_name || ' ' || inspector.last_name AS assigned_inspector_name,
	completer.first_name || ' ' || completer.last_name AS completed_by_name
FROM inspections i
JOIN fire_extinguishers fe ON fe.id = i.extinguisher_id
JOIN users scheduler ON scheduler.id = i.scheduled_by
LEFT JOIN users inspector ON inspector.id = i.assigned_inspector_id
LEFT JOIN users completer ON completer.id = i.completed_by;

CREATE OR REPLACE VIEW v_inspection_open_queue AS
SELECT *
FROM v_inspection_detail
WHERE status IN ('scheduled', 'overdue')
	AND assigned_inspector_name IS NULL
ORDER BY scheduled_date, scheduled_time;

CREATE OR REPLACE VIEW v_maintenance_detail AS
SELECT
	m.id AS maintenance_id,
	m.maintenance_date,
	m.action_taken,
	m.issues_identified,
	m.notes,
	m.created_at,
	fe.serial_number,
	fe.location,
	fe.type AS extinguisher_type,
	performer.first_name || ' ' || performer.last_name AS performed_by_name,
	performer.role AS performed_by_role
FROM maintenance_logs m
JOIN fire_extinguishers fe ON fe.id = m.extinguisher_id
JOIN users performer ON performer.id = m.performed_by;

CREATE OR REPLACE VIEW v_compliance_snapshot AS
SELECT
	COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_units,
	COUNT(*) FILTER (
		WHERE status = 'needs_maintenance'
	)::int AS needs_maintenance_units,
	COUNT(*) FILTER (
		WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
			AND status <> 'decommissioned'
	)::int AS expiring_within_30_days,
	COUNT(*)::int AS total_units
FROM fire_extinguishers;

CREATE OR REPLACE VIEW v_upcoming_expirations AS
SELECT
	serial_number,
	location,
	type,
	expiry_date,
	status,
	(expiry_date - CURRENT_DATE) AS days_until_expiry
FROM fire_extinguishers
WHERE expiry_date >= CURRENT_DATE
	AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
	AND status <> 'decommissioned'
ORDER BY expiry_date;

CREATE OR REPLACE VIEW v_notification_inbox AS
SELECT
	n.id AS notification_id,
	n.title,
	n.message,
	n.type,
	n.read,
	n.related_entity_type,
	n.related_entity_id,
	n.created_at,
	u.email AS recipient_email,
	u.first_name || ' ' || u.last_name AS recipient_name,
	u.role AS recipient_role
FROM notifications n
JOIN users u ON u.id = n.user_id;

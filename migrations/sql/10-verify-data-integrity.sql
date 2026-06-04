-- TZW: verify data integrity

SELECT 'users' AS table_name, COUNT(*)::bigint AS row_count FROM users
UNION ALL SELECT 'fire_extinguishers', COUNT(*) FROM fire_extinguishers
UNION ALL SELECT 'inspections', COUNT(*) FROM inspections
UNION ALL SELECT 'maintenance_logs', COUNT(*) FROM maintenance_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'email_verification_tokens', COUNT(*) FROM email_verification_tokens
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
ORDER BY table_name;

SELECT
	COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
	COUNT(*) FILTER (WHERE role = 'inspector')::int AS inspectors,
	COUNT(*) FILTER (WHERE role = 'user')::int AS users
FROM users;

SELECT email, COUNT(*) AS duplicate_count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

SELECT i.id AS orphan_inspection_id
FROM inspections i
LEFT JOIN fire_extinguishers fe ON fe.id = i.extinguisher_id
WHERE fe.id IS NULL;

SELECT m.id AS orphan_maintenance_id
FROM maintenance_logs m
LEFT JOIN fire_extinguishers fe ON fe.id = m.extinguisher_id
WHERE fe.id IS NULL;

SELECT i.id, i.assigned_inspector_id, u.email, u.role
FROM inspections i
JOIN users u ON u.id = i.assigned_inspector_id
WHERE u.role NOT IN ('inspector', 'admin');

SELECT id, scheduled_date, status
FROM inspections
WHERE status = 'overdue'
ORDER BY scheduled_date
LIMIT 20;

SELECT serial_number, expiry_date, status
FROM fire_extinguishers
WHERE expiry_date < CURRENT_DATE
  AND status NOT IN ('expired', 'decommissioned')
LIMIT 20;

SELECT * FROM v_compliance_snapshot;
SELECT * FROM v_inspection_status_summary;
SELECT * FROM v_users_by_role;

SELECT recipient_email, COUNT(*) AS unread
FROM v_notification_inbox
WHERE read = false
GROUP BY recipient_email
ORDER BY unread DESC
LIMIT 10;

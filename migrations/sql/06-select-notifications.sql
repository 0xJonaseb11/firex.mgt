-- TZW: select notifications

SELECT *
FROM v_notification_inbox
ORDER BY created_at DESC;

SELECT
	recipient_email,
	recipient_role,
	COUNT(*) FILTER (WHERE read = false)::int AS unread_count,
	COUNT(*)::int AS total_notifications
FROM v_notification_inbox
GROUP BY recipient_email, recipient_role
ORDER BY unread_count DESC;

SELECT *
FROM v_notification_inbox
WHERE recipient_email = 'inspector.demo@tzw.local'
  AND read = false
ORDER BY created_at DESC;

SELECT *
FROM v_notification_inbox
WHERE type IN (
	'inspection_scheduled',
	'inspection_overdue',
	'inspection_completed'
)
ORDER BY created_at DESC;

SELECT *
FROM v_notification_inbox
WHERE type = 'maintenance_logged'
ORDER BY created_at DESC;

-- SELECT * FROM v_notification_inbox
-- WHERE related_entity_type = 'inspection'
--   AND related_entity_id = 'your_inspection_id';

-- TZW: select inspections

SELECT *
FROM v_inspection_detail
ORDER BY scheduled_date DESC, scheduled_time;

SELECT * FROM v_inspection_status_summary;

SELECT *
FROM v_inspection_detail
WHERE status = 'scheduled'
ORDER BY scheduled_date, scheduled_time;

SELECT *
FROM v_inspection_detail
WHERE status = 'overdue'
ORDER BY scheduled_date;

SELECT *
FROM v_inspection_detail
WHERE status = 'completed'
ORDER BY completed_at DESC NULLS LAST;

SELECT *
FROM v_inspection_detail
WHERE status = 'cancelled'
ORDER BY updated_at DESC;

SELECT * FROM v_inspection_open_queue;

SELECT i.*
FROM v_inspection_detail i
WHERE scheduled_by_email = 'user.demo@tzw.local';

SELECT i.*
FROM v_inspection_detail i
WHERE assigned_inspector_name IS NOT NULL
  AND i.assigned_inspector_name ILIKE '%inspector%';

SELECT *
FROM v_inspection_detail
WHERE status IN ('scheduled', 'overdue')
  AND (
    assigned_inspector_name IS NULL
    OR assigned_inspector_name ILIKE '%demo%'
  )
ORDER BY scheduled_date;

SELECT i.*
FROM v_inspection_detail i
JOIN fire_extinguishers fe ON fe.serial_number = i.serial_number
WHERE fe.serial_number = 'FE-001'
ORDER BY i.scheduled_date DESC;

SELECT serial_number, location, scheduled_date, scheduled_time, status, scheduled_by_name
FROM v_inspection_detail
WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status IN ('scheduled', 'overdue')
ORDER BY scheduled_date, scheduled_time;

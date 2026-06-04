-- TZW: seed demo users

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DELETE FROM users WHERE email IN (
--   'admin.demo@tzw.local',
--   'inspector.demo@tzw.local',
--   'user.demo@tzw.local'
-- );

-- admin.demo@tzw.local / TzwAdmin2026!
INSERT INTO users (
	id,
	first_name,
	last_name,
	email,
	password,
	role,
	email_verified,
	refresh_token_version,
	created_at,
	updated_at
) VALUES (
	'usr_demo_admin',
	'Demo',
	'Administrator',
	'admin.demo@tzw.local',
	crypt('TzwAdmin2026!', gen_salt('bf', 12)),
	'admin',
	true,
	1,
	NOW(),
	NOW()
)
ON CONFLICT (email) DO UPDATE SET
	first_name = EXCLUDED.first_name,
	last_name = EXCLUDED.last_name,
	password = EXCLUDED.password,
	role = EXCLUDED.role,
	email_verified = EXCLUDED.email_verified,
	updated_at = NOW();

-- inspector.demo@tzw.local / TzwInspector2026!
INSERT INTO users (
	id,
	first_name,
	last_name,
	email,
	password,
	role,
	email_verified,
	refresh_token_version,
	created_at,
	updated_at
) VALUES (
	'usr_demo_inspector',
	'Demo',
	'Inspector',
	'inspector.demo@tzw.local',
	crypt('TzwInspector2026!', gen_salt('bf', 12)),
	'inspector',
	true,
	1,
	NOW(),
	NOW()
)
ON CONFLICT (email) DO UPDATE SET
	first_name = EXCLUDED.first_name,
	last_name = EXCLUDED.last_name,
	password = EXCLUDED.password,
	role = EXCLUDED.role,
	email_verified = EXCLUDED.email_verified,
	updated_at = NOW();

-- user.demo@tzw.local / TzwUser2026!
INSERT INTO users (
	id,
	first_name,
	last_name,
	email,
	password,
	role,
	email_verified,
	refresh_token_version,
	created_at,
	updated_at
) VALUES (
	'usr_demo_user',
	'Demo',
	'User',
	'user.demo@tzw.local',
	crypt('TzwUser2026!', gen_salt('bf', 12)),
	'user',
	true,
	1,
	NOW(),
	NOW()
)
ON CONFLICT (email) DO UPDATE SET
	first_name = EXCLUDED.first_name,
	last_name = EXCLUDED.last_name,
	password = EXCLUDED.password,
	role = EXCLUDED.role,
	email_verified = EXCLUDED.email_verified,
	updated_at = NOW();

SELECT id, email, role, email_verified, created_at
FROM users
WHERE email IN (
	'admin.demo@tzw.local',
	'inspector.demo@tzw.local',
	'user.demo@tzw.local'
)
ORDER BY role;

/*
INSERT INTO fire_extinguishers (
	id,
	serial_number,
	location,
	type,
	size,
	installation_date,
	expiry_date,
	status,
	created_by,
	created_at,
	updated_at
) VALUES (
	'fe_demo_001',
	'FE-DEMO-001',
	'Main building — Ground floor',
	'co2',
	'5 lbs.',
	CURRENT_DATE - INTERVAL '1 year',
	CURRENT_DATE + INTERVAL '1 year',
	'active',
	'usr_demo_admin',
	NOW(),
	NOW()
)
ON CONFLICT (serial_number) DO NOTHING;
*/

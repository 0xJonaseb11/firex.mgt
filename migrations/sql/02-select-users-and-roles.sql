-- TZW: select users and roles

SELECT
	id,
	first_name,
	last_name,
	email,
	role,
	email_verified,
	refresh_token_version,
	created_at,
	updated_at
FROM users
ORDER BY role, last_name, first_name;

SELECT role, COUNT(*) AS user_count
FROM users
GROUP BY role
ORDER BY role;

SELECT * FROM v_users_by_role;

SELECT id, first_name, last_name, email, email_verified, created_at
FROM users
WHERE role = 'admin'
ORDER BY email;

SELECT id, first_name, last_name, email, email_verified
FROM users
WHERE role IN ('inspector', 'admin')
ORDER BY last_name;

SELECT id, first_name, last_name, email, email_verified
FROM users
WHERE role = 'user'
ORDER BY email;

SELECT id, email, role, created_at
FROM users
WHERE email_verified = false
ORDER BY created_at DESC;

SELECT
	evt.id,
	u.email,
	evt.expires_at,
	evt.created_at
FROM email_verification_tokens evt
JOIN users u ON u.id = evt.user_id
WHERE evt.expires_at > NOW()
ORDER BY evt.expires_at;

SELECT
	prt.id,
	u.email,
	prt.expires_at,
	prt.created_at
FROM password_reset_tokens prt
JOIN users u ON u.id = prt.user_id
WHERE prt.expires_at > NOW()
ORDER BY prt.expires_at;

-- TZW: update user roles

UPDATE users
SET role = 'admin',
	email_verified = true,
	updated_at = NOW()
WHERE email = 'jonassebera@gmail.com';

UPDATE users
SET role = 'inspector',
	email_verified = true,
	updated_at = NOW()
WHERE email = 'sebejaz99@gmail.com';

-- UPDATE users
-- SET role = 'user', updated_at = NOW()
-- WHERE email = 'someone@example.com';

SELECT id, email, first_name, last_name, role, email_verified
FROM users
ORDER BY email;

/*
UPDATE users
SET role = 'admin', email_verified = true, updated_at = NOW()
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);
*/

SELECT role, COUNT(*) AS user_count
FROM users
GROUP BY role
ORDER BY role;

-- UPDATE users SET refresh_token_version = refresh_token_version + 1
-- WHERE email IN ('jonassebera@gmail.com', 'sebejaz99@gmail.com');

import pool from '../config/db.js';

export async function findUserBySubject(subject, client = pool) {
  const { rows } = await client.query(`SELECT * FROM users WHERE keycloak_subject_id = $1`, [subject]);
  return rows[0] || null;
}

export async function findUserByEmail(email, client = pool) {
  const { rows } = await client.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

export async function upsertUserFromToken({ subject, email, fullName }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO users (keycloak_subject_id, email, full_name, role)
     VALUES ($1, $2, $3, 'staff')
     ON CONFLICT (keycloak_subject_id) DO UPDATE
       SET email = COALESCE(EXCLUDED.email, users.email),
           full_name = COALESCE(EXCLUDED.full_name, users.full_name)
     RETURNING *`,
    [subject, email, fullName || 'Unknown User']
  );
  return rows[0];
}

export async function findRoleByName(name, client = pool) {
  const { rows } = await client.query(`SELECT * FROM roles WHERE name = $1`, [name]);
  return rows[0] || null;
}

export async function listRoles(client = pool) {
  const { rows } = await client.query(`SELECT * FROM roles ORDER BY name`);
  return rows;
}

export async function listPermissionsForRoles(roleNames, client = pool) {
  if (!roleNames.length) return [];
  const { rows } = await client.query(
    `SELECT DISTINCT p.key
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     WHERE r.name = ANY($1::text[])`,
    [roleNames]
  );
  return rows.map((r) => r.key);
}

export async function listRolesForUser(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.name);
}

export async function assignRoleToUser(userId, roleName, client = pool) {
  const role = await findRoleByName(roleName, client);
  if (!role) return null;
  await client.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, role.id]
  );
  return role;
}

export async function revokeRoleFromUser(userId, roleName, client = pool) {
  const role = await findRoleByName(roleName, client);
  if (!role) return false;
  const result = await client.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [userId, role.id]);
  return result.rowCount > 0;
}

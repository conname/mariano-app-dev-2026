const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../db');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const validRoles = ['reader', 'author', 'admin'];

    if (!username || !password || !role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Missing field or invalid role' });
    }

    const userEmail = email || `${username}@example.com`;

    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, userEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    const [roleRows] = await db.query('SELECT id FROM roles WHERE role = ?', [role]);
    const roleId = roleRows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (email, username, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
      [userEmail, username, passwordHash, roleId]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Missing username or password' });
    }

    const [users] = await db.query(
      `SELECT u.id, u.email, u.username, u.password_hash, u.is_active, r.role 
       FROM users u JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User does not exist' });
    }

    const user = users.at(0);
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is inactive', code: 'INACTIVE_ACCOUNT' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Wrong credentials' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role, is_active: 1,type: 'access' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: `${process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7}d` }
    );

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7));

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Missing token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const tokenHash = hashToken(refreshToken);
    const [tokens] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.status(401).json({ message: 'Invalid, expired, or revoked token' });
    }

    const [users] = await db.query(
      `SELECT u.id, u.email, u.username, r.role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [decoded.id]
    );
    const user = users[0];

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role, type: 'access' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );

    res.status(200).json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Missing token' });
    }

    const tokenHash = hashToken(refreshToken);
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
      [tokenHash]
    );

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, r.role, u.is_active, u.admin_notification
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [decoded.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(rows.at(0));
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const verifyAdminToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { error: 401 };
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'access' || decoded.role !== 'admin') return { error: 403 };
    return { admin: decoded };
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { error: 401 };
    return { error: 403 };
  }
};

exports.getAllUsersAdmin = async (req, res) => {
  try {
    const { admin, error } = verifyAdminToken(req);
    if (!admin) return res.status(error).json({ message: error === 401 ? 'Token expired' : 'Forbidden: Admins only' });

    const [rows] = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.is_active, 
        u.admin_notification,
        r.role,
        COUNT(p.id) AS post_count
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN posts p ON p.author_id = u.id
      GROUP BY u.id, u.username, u.email, u.is_active, u.admin_notification, r.role
      ORDER BY u.id ASC
    `);

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { admin, error } = verifyAdminToken(req);
    if (!admin) return res.status(error).json({ message: error === 401 ? 'Token expired' : 'Forbidden: Admins only' });

    const { role } = req.body;
    const [roleRows] = await db.query('SELECT id FROM roles WHERE role = ?', [role]);
    if (roleRows.length === 0) return res.status(400).json({ message: 'Invalid role' });

    await db.query(
      'UPDATE users SET role_id = ?, admin_notification = NULL WHERE id = ?',
      [roleRows.at(0).id, req.params.id]
    );

    res.status(200).json({ message: 'User role updated' });

        const [targetRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.params.id]);
    const targetUsername = targetRows.at(0)?.username || `User #${req.params.id}`;

    await db.query(
      `INSERT INTO admin(action_type, actor_id, actor_username, target_user_id, target_username, details)
       VALUES ('role_change', ?, ?, ?, ?, ?)`,
      [admin.id, admin.username, req.params.id, targetUsername, `Changed role to ${role.toUpperCase()}`]
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserActivity = async (req, res) => {
  try {
    const { admin, error } = verifyAdminToken(req);
    if (!admin) return res.status(error).json({ message: error === 401 ? 'Token expired' : 'Forbidden: Admins only' });

    const { is_active } = req.body;
    await db.query(
      'UPDATE users SET is_active = ?, admin_notification = NULL WHERE id = ?',
      [is_active ? 1 : 0, req.params.id]
    );

    res.status(200).json({ message: 'User activity status updated' });

        const [targetRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.params.id]);
    const targetUsername = targetRows.at(0)?.username || `User #${req.params.id}`;

    await db.query(
      `INSERT INTO admin(action_type, actor_id, actor_username, target_user_id, target_username, details)
       VALUES ('activity_change', ?, ?, ?, ?, ?)`,
      [admin.id, admin.username, req.params.id, targetUsername, `Set status to ${is_active ? 'Active' : 'Inactive'}`]
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestAdminAction = async (req, res) => {
  try {
    const { username, requestType, desiredRole } = req.body;
    if (!username || !['role', 'activity'].includes(requestType)) {
      return res
        .status(400)
        .json({ message: 'Username and valid requestType (role or activity) are required' });
    }

    const [users] = await db.query(
      `SELECT u.id, u.username, u.role_id, u.is_active, r.role AS requested_role_name
       FROM users u
       LEFT JOIN roles r ON r.id = ? OR LOWER(r.role) = LOWER(?)
       WHERE u.username = ?
       LIMIT 1`,
      [Number(desiredRole) || 0, String(desiredRole || ''), username]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const targetUser = users.at(0);
    let notifText = '';

    if (targetUser.admin_notification && targetUser.admin_notification.trim().length > 0) {
      return res.status(409).json({
        message: `You already have a pending request (${targetUser.admin_notification}). Please wait until an administrator fulfills it.`,
        pendingNotification: targetUser.admin_notification,
      });
    }

    if (requestType === 'role') {
      const targetRole = (targetUser.requested_role_name || 'AUTHOR').toUpperCase();
      notifText = `Requesting Role Change to ${targetRole}`;
    } else if (requestType === 'activity') {
      const targetStatus = Number(targetUser.is_active) === 1 ? 'Inactive' : 'Active';
      notifText = `Requesting Activity Status: ${targetStatus}`;
    }

    await db.query('UPDATE users SET admin_notification = ? WHERE id = ?', [
      notifText,
      targetUser.id,
    ]);

    res.status(200).json({ message: 'Request sent to administrator', notification: notifText });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
  }
};


exports.getAdminLogs = async (req, res) => {
  try {
    const { admin, error } = verifyAdminToken(req);
    if (!admin) return res.status(error).json({ message: error === 401 ? 'Token expired' : 'Forbidden: Admins only' });

    const [logs] = await db.query(
      'SELECT * FROM admin ORDER BY created_at DESC, id DESC'
    );
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

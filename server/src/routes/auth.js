import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAuth, signUserToken } from '../middleware/auth.js';
import { sendMail } from '../mailer.js';

const router = Router();

const OTP_TTL_MINUTES = 10;
const RESET_TTL_MINUTES = 30;

const publicUser = (u) => ({ id: u.id, email: u.email, role: u.role, email_verified: u.email_verified });

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const existing = await query('select id, email_verified from users where email = $1', [email]);
  if (existing.rows.length && existing.rows[0].email_verified) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing.rows.length) {
    await query('update users set password_hash = $1 where email = $2', [passwordHash, email]);
  } else {
    await query('insert into users (email, password_hash) values ($1, $2)', [email, passwordHash]);
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await query(
    'insert into email_otps (email, code_hash, expires_at) values ($1, $2, $3)',
    [email, hashToken(code), expiresAt]
  );
  await sendMail({
    to: email,
    subject: 'Your MathFlow verification code',
    text: `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  });

  res.json({ ok: true });
});

router.post('/resend-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await query(
    'insert into email_otps (email, code_hash, expires_at) values ($1, $2, $3)',
    [email, hashToken(code), expiresAt]
  );
  await sendMail({
    to: email,
    subject: 'Your MathFlow verification code',
    text: `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  });

  res.json({ ok: true });
});

router.post('/verify-otp', async (req, res) => {
  const { email, otpCode } = req.body || {};
  if (!email || !otpCode) return res.status(400).json({ error: 'Email and code are required' });

  const { rows } = await query(
    `select id from email_otps
     where email = $1 and code_hash = $2 and consumed = false and expires_at > now()
     order by created_at desc limit 1`,
    [email, hashToken(otpCode)]
  );
  if (!rows.length) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  await query('update email_otps set consumed = true where id = $1', [rows[0].id]);

  const userResult = await query(
    'update users set email_verified = true where email = $1 returning *',
    [email]
  );
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: 'Account not found' });

  res.json({ access_token: signUserToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { rows } = await query('select * from users where email = $1', [email]);
  const user = rows[0];
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.email_verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in' });
  }
  res.json({ access_token: signUserToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('select * from users where id = $1', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Account not found' });
  res.json(publicUser(rows[0]));
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { rows } = await query('select id from users where email = $1', [email]);
  // Always respond ok — never reveal whether an account exists.
  if (rows.length) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await query(
      'insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)',
      [rows[0].id, hashToken(rawToken), expiresAt]
    );
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendMail({
      to: email,
      subject: 'Reset your MathFlow password',
      text: `Reset your password: ${resetUrl}\nThis link expires in ${RESET_TTL_MINUTES} minutes.`,
    });
  }
  res.json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }
  const { rows } = await query(
    `select * from password_reset_tokens
     where token_hash = $1 and consumed = false and expires_at > now()
     order by created_at desc limit 1`,
    [hashToken(resetToken)]
  );
  if (!rows.length) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('update users set password_hash = $1 where id = $2', [passwordHash, rows[0].user_id]);
  await query('update password_reset_tokens set consumed = true where id = $1', [rows[0].id]);

  res.json({ ok: true });
});

// --- Google OAuth (authorization-code flow, no extra SDK) ---

router.get('/google', (req, res) => {
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  let returnTo = '/';
  try {
    returnTo = JSON.parse(Buffer.from(String(state), 'base64url').toString()).returnTo || '/';
  } catch {
    // keep default
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error('Google token exchange failed');
    const tokens = await tokenRes.json();

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error('Google profile fetch failed');
    const profile = await profileRes.json();

    const { rows: byGoogleId } = await query('select * from users where google_id = $1', [profile.sub]);
    let user = byGoogleId[0];

    if (!user) {
      const { rows: byEmail } = await query('select * from users where email = $1', [profile.email]);
      if (byEmail[0]) {
        const updated = await query(
          'update users set google_id = $1, email_verified = true where id = $2 returning *',
          [profile.sub, byEmail[0].id]
        );
        user = updated.rows[0];
      } else {
        const inserted = await query(
          'insert into users (email, google_id, email_verified) values ($1, $2, true) returning *',
          [profile.email, profile.sub]
        );
        user = inserted.rows[0];
      }
    }

    const token = signUserToken(user);
    const redirectUrl = new URL(returnTo, process.env.FRONTEND_URL);
    redirectUrl.searchParams.set('access_token', token);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    const failUrl = new URL('/login', process.env.FRONTEND_URL);
    failUrl.searchParams.set('error', 'google_auth_failed');
    res.redirect(failUrl.toString());
  }
});

export default router;

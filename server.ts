import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { MENU_ITEMS } from './src/data/menu.ts';

dotenv.config();

const scryptAsync = promisify(scryptCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveListenPort(): number {
  const portFlagIndex = process.argv.indexOf('--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const cliPort = Number(process.argv[portFlagIndex + 1]);
    if (Number.isInteger(cliPort) && cliPort > 0) return cliPort;
  }
  const inlineFlag = process.argv.find((arg) => arg.startsWith('--port='));
  if (inlineFlag) {
    const cliPort = Number(inlineFlag.slice('--port='.length));
    if (Number.isInteger(cliPort) && cliPort > 0) return cliPort;
  }
  if (process.env.NODE_ENV === 'production') {
    const envPort = Number(process.env.PORT);
    if (Number.isInteger(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

const PORT = resolveListenPort();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0
    ? process.env.SESSION_SECRET
    : randomBytes(32).toString('hex');

const MENU_ITEM_MAP = new Map(MENU_ITEMS.map((item) => [item.id, item.name]));

type Role = 'customer' | 'admin';
type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface TokenPayload {
  sub: string;
  role: Role;
  exp: number;
}

interface AuthRequest extends Request {
  auth?: TokenPayload;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  user_id: string;
  author_name: string;
  author_email?: string;
  rating: number;
  product_id: string | null;
  product_name: string | null;
  comment: string;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

function initDatabase(dbPath: string): DatabaseSync {
  const dir = path.dirname(dbPath);
  if (dir !== ':memory:') {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      product_id TEXT,
      product_name TEXT,
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      moderated_by TEXT,
      moderated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derived = (await scryptAsync(password, salt, keyBuf.length)) as Buffer;
    if (keyBuf.length !== derived.length) return false;
    return timingSafeEqual(keyBuf, derived);
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

function signToken(sub: string, role: Role): string {
  const payload: TokenPayload = {
    sub,
    role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<TokenPayload>;
    if (
      typeof parsed.sub !== 'string' ||
      (parsed.role !== 'customer' && parsed.role !== 'admin') ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return {
      sub: parsed.sub,
      role: parsed.role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): TokenPayload | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  return verifyToken(token);
}

function sanitizeName(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
}

function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function sanitizeComment(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim();
}

function serializeUser(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    createdAt: row.created_at,
  };
}

function serializePublicReview(row: ReviewRow) {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    rating: row.rating,
    productId: row.product_id,
    productName: row.product_name,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeAdminReview(row: ReviewRow) {
  return {
    ...serializePublicReview(row),
    authorEmail: row.author_email ?? '',
    moderatedAt: row.moderated_at,
  };
}

export function createApiApp(dbPath = path.join(__dirname, '.data', 'ann_bakery.db')) {
  const db = initDatabase(dbPath);
  const app = express();

  app.use(express.json({ limit: '64kb' }));

  const requireCustomerAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const payload = extractBearerToken(req);
    if (!payload || payload.role !== 'customer') {
      return res.status(401).json({ error: 'Please sign in to your customer account.' });
    }
    req.auth = payload;
    next();
  };

  const requireAdminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const payload = extractBearerToken(req);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator moderation access required.' });
    }
    req.auth = payload;
    next();
  };

  const getAdminConfigState = (): {
    configured: boolean;
    source: 'env' | 'claimed' | 'unclaimed';
    claimedHash: string | null;
  } => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      return { configured: true, source: 'env', claimedHash: null };
    }
    const row = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get('admin_passcode_hash') as { value: string } | undefined;
    if (row?.value) {
      return { configured: true, source: 'claimed', claimedHash: row.value };
    }
    return { configured: false, source: 'unclaimed', claimedHash: null };
  };

  // --- Customer Auth Routes ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const name = sanitizeName(req.body?.name);
      const email = sanitizeEmail(req.body?.email);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const confirmPassword =
        typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

      if (name.length < 2 || name.length > 80) {
        return res
          .status(400)
          .json({ error: 'Please enter your name (between 2 and 80 characters).' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (password.length < 8 || password.length > 128) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 8 characters long.' });
      }
      if (password !== confirmPassword) {
        return res
          .status(400)
          .json({ error: 'Password and password confirmation do not match.' });
      }

      const existing = db
        .prepare('SELECT id FROM profiles WHERE email = ?')
        .get(email) as { id: string } | undefined;
      if (existing) {
        return res
          .status(409)
          .json({ error: 'An account with this email address already exists.' });
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const passwordHash = await hashPassword(password);

      db.prepare(
        `INSERT INTO profiles (id, name, email, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'customer', ?, ?)`,
      ).run(id, name, email, passwordHash, now, now);

      const created = db
        .prepare('SELECT * FROM profiles WHERE id = ?')
        .get(id) as unknown as ProfileRow;

      const token = signToken(created.id, 'customer');
      return res.status(201).json({
        token,
        user: serializeUser(created),
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Unable to create account right now.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const email = sanitizeEmail(req.body?.email);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!isValidEmail(email) || !password) {
        return res
          .status(400)
          .json({ error: 'Please provide both your email address and password.' });
      }

      const profile = db
        .prepare('SELECT * FROM profiles WHERE email = ?')
        .get(email) as unknown as ProfileRow | undefined;

      if (!profile || !(await verifyPassword(password, profile.password_hash))) {
        return res.status(401).json({ error: 'Invalid email address or password.' });
      }

      const token = signToken(profile.id, 'customer');
      return res.json({
        token,
        user: serializeUser(profile),
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Unable to sign in right now.' });
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const profile = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(req.auth!.sub) as unknown as ProfileRow | undefined;
    if (!profile) {
      return res.status(401).json({ error: 'Account not found.' });
    }
    return res.json({ user: serializeUser(profile) });
  });

  app.patch('/api/auth/profile', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const name = sanitizeName(req.body?.name);
    if (name.length < 2 || name.length > 80) {
      return res
        .status(400)
        .json({ error: 'Display name must be between 2 and 80 characters.' });
    }

    const now = new Date().toISOString();
    const result = db
      .prepare('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, req.auth!.sub);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer profile not found.' });
    }

    const updated = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(req.auth!.sub) as unknown as ProfileRow;

    return res.json({ user: serializeUser(updated) });
  });

  app.post(
    '/api/auth/change-password',
    requireCustomerAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const currentPassword =
          typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
        const newPassword =
          typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
        const confirmPassword =
          typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ error: 'Please provide your current and new password.' });
        }
        if (newPassword.length < 8 || newPassword.length > 128) {
          return res
            .status(400)
            .json({ error: 'New password must be at least 8 characters long.' });
        }
        if (newPassword !== confirmPassword) {
          return res
            .status(400)
            .json({ error: 'New password and confirmation do not match.' });
        }

        const profile = db
          .prepare('SELECT * FROM profiles WHERE id = ?')
          .get(req.auth!.sub) as unknown as ProfileRow | undefined;
        if (!profile) {
          return res.status(404).json({ error: 'Account not found.' });
        }

        const validCurrent = await verifyPassword(currentPassword, profile.password_hash);
        if (!validCurrent) {
          return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const nextHash = await hashPassword(newPassword);
        const now = new Date().toISOString();
        db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?').run(
          nextHash,
          now,
          profile.id,
        );

        return res.json({ message: 'Your password has been updated securely.' });
      } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Unable to update password right now.' });
      }
    },
  );

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const email = sanitizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const profile = db
      .prepare('SELECT id FROM profiles WHERE email = ?')
      .get(email) as { id: string } | undefined;

    if (profile) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

      db.prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(randomUUID(), profile.id, tokenHash, expiresAt, now.toISOString());
    }

    // Never confirm email existence or expose reset tokens in an unauthenticated response.
    return res.json({
      emailDeliveryConfigured: false,
      message:
        'Automated password reset emails require an email delivery provider (such as Supabase Auth or SMTP) to be configured. If you are signed in, you can change your password inside your Customer Profile, or message ANN BAKERY HOUSE on WhatsApp for assistance.',
    });
  });

  // --- Customer & Public Reviews Routes ---
  app.get('/api/reviews', (_req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT r.*, p.name AS author_name
         FROM reviews r
         INNER JOIN profiles p ON p.id = r.user_id
         WHERE r.status = 'approved'
         ORDER BY r.created_at DESC`,
      )
      .all() as unknown as ReviewRow[];

    const reviews = rows.map(serializePublicReview);
    const approvedCount = reviews.length;
    const averageRating =
      approvedCount > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + item.rating, 0) / approvedCount
            ).toFixed(1),
          )
        : null;

    return res.json({
      reviews,
      stats: {
        approvedCount,
        averageRating,
      },
    });
  });

  app.get('/api/reviews/mine', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const rows = db
      .prepare(
        `SELECT r.*, p.name AS author_name
         FROM reviews r
         INNER JOIN profiles p ON p.id = r.user_id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
      )
      .all(req.auth!.sub) as unknown as ReviewRow[];

    return res.json({
      reviews: rows.map(serializePublicReview),
    });
  });

  app.post('/api/reviews', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const rating = Number(req.body?.rating);
    const comment = sanitizeComment(req.body?.comment);
    const requestedProductId =
      typeof req.body?.productId === 'string' && req.body.productId.trim()
        ? req.body.productId.trim()
        : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please select a star rating between 1 and 5.' });
    }
    if (comment.length < 5 || comment.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Review text must be between 5 and 1,000 characters.' });
    }

    let resolvedProductId: string | null = null;
    let resolvedProductName: string | null = null;
    if (requestedProductId) {
      const matchedName = MENU_ITEM_MAP.get(requestedProductId);
      if (!matchedName) {
        return res.status(400).json({ error: 'Selected product was not found on the official menu.' });
      }
      resolvedProductId = requestedProductId;
      resolvedProductName = matchedName;
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    // Status is strictly forced to 'pending'; customers cannot approve their own reviews.
    db.prepare(
      `INSERT INTO reviews (
         id, user_id, rating, product_id, product_name, comment, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).run(
      id,
      req.auth!.sub,
      rating,
      resolvedProductId,
      resolvedProductName,
      comment,
      now,
      now,
    );

    const created = db
      .prepare(
        `SELECT r.*, p.name AS author_name
         FROM reviews r
         INNER JOIN profiles p ON p.id = r.user_id
         WHERE r.id = ?`,
      )
      .get(id) as unknown as ReviewRow;

    return res.status(201).json({
      review: serializePublicReview(created),
    });
  });

  app.patch('/api/reviews/:id', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const reviewId = req.params.id;
    const existing = db
      .prepare('SELECT * FROM reviews WHERE id = ?')
      .get(reviewId) as { id: string; user_id: string } | undefined;

    if (!existing) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (existing.user_id !== req.auth!.sub) {
      return res.status(403).json({ error: 'You can only edit your own reviews.' });
    }

    const rating = Number(req.body?.rating);
    const comment = sanitizeComment(req.body?.comment);
    const requestedProductId =
      typeof req.body?.productId === 'string' && req.body.productId.trim()
        ? req.body.productId.trim()
        : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please select a star rating between 1 and 5.' });
    }
    if (comment.length < 5 || comment.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Review text must be between 5 and 1,000 characters.' });
    }

    let resolvedProductId: string | null = null;
    let resolvedProductName: string | null = null;
    if (requestedProductId) {
      const matchedName = MENU_ITEM_MAP.get(requestedProductId);
      if (!matchedName) {
        return res.status(400).json({ error: 'Selected product was not found on the official menu.' });
      }
      resolvedProductId = requestedProductId;
      resolvedProductName = matchedName;
    }

    const now = new Date().toISOString();
    // Editing resets review status to 'pending' for re-moderation so customers cannot bypass approval.
    db.prepare(
      `UPDATE reviews
       SET rating = ?, product_id = ?, product_name = ?, comment = ?,
           status = 'pending', moderated_by = NULL, moderated_at = NULL, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      rating,
      resolvedProductId,
      resolvedProductName,
      comment,
      now,
      reviewId,
      req.auth!.sub,
    );

    const updated = db
      .prepare(
        `SELECT r.*, p.name AS author_name
         FROM reviews r
         INNER JOIN profiles p ON p.id = r.user_id
         WHERE r.id = ?`,
      )
      .get(reviewId) as unknown as ReviewRow;

    return res.json({
      review: serializePublicReview(updated),
    });
  });

  app.delete('/api/reviews/:id', requireCustomerAuth, (req: AuthRequest, res: Response) => {
    const reviewId = req.params.id;
    const existing = db
      .prepare('SELECT id, user_id FROM reviews WHERE id = ?')
      .get(reviewId) as { id: string; user_id: string } | undefined;

    if (!existing) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (existing.user_id !== req.auth!.sub) {
      return res.status(403).json({ error: 'You can only delete your own reviews.' });
    }

    db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?').run(reviewId, req.auth!.sub);
    return res.json({ ok: true });
  });

  // --- Admin Moderation Routes ---
  app.get('/api/admin/status', (req: Request, res: Response) => {
    const state = getAdminConfigState();
    const payload = extractBearerToken(req);
    return res.json({
      configured: state.configured,
      source: state.source,
      authenticated: Boolean(payload && payload.role === 'admin'),
    });
  });

  app.post('/api/admin/bootstrap', async (req: Request, res: Response) => {
    try {
      const state = getAdminConfigState();
      if (state.configured) {
        return res
          .status(409)
          .json({ error: 'An administrator passcode is already configured.' });
      }

      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      const confirmPasscode =
        typeof req.body?.confirmPasscode === 'string' ? req.body.confirmPasscode.trim() : '';

      if (passcode.length < 8 || passcode.length > 128) {
        return res
          .status(400)
          .json({ error: 'Admin passcode must be at least 8 characters long.' });
      }
      if (passcode !== confirmPasscode) {
        return res
          .status(400)
          .json({ error: 'Passcode and confirmation do not match.' });
      }

      const hash = await hashPassword(passcode);
      const insert = db
        .prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)')
        .run('admin_passcode_hash', hash);

      if (insert.changes === 0) {
        return res
          .status(409)
          .json({ error: 'An administrator passcode was already claimed.' });
      }

      const token = signToken('admin-moderator', 'admin');
      return res.status(201).json({ token });
    } catch (error) {
      console.error('Admin bootstrap error:', error);
      return res.status(500).json({ error: 'Unable to configure admin passcode.' });
    }
  });

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      if (!passcode) {
        return res.status(400).json({ error: 'Please enter the administrator passcode.' });
      }

      const state = getAdminConfigState();
      if (!state.configured) {
        return res.status(400).json({ error: 'Administrator passcode has not been set up yet.' });
      }

      let valid = false;
      if (state.source === 'env') {
        valid = timingSafeStringEqual(passcode, process.env.ADMIN_PASSCODE!.trim());
      } else if (state.claimedHash) {
        valid = await verifyPassword(passcode, state.claimedHash);
      }

      if (!valid) {
        return res.status(401).json({ error: 'Invalid administrator passcode.' });
      }

      const token = signToken('admin-moderator', 'admin');
      return res.json({ token });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({ error: 'Unable to sign in as moderator.' });
    }
  });

  app.get('/api/admin/reviews', requireAdminAuth, (req: AuthRequest, res: Response) => {
    const statusParam = typeof req.query.status === 'string' ? req.query.status : 'all';
    const validStatuses = new Set(['pending', 'approved', 'rejected']);

    const rows = validStatuses.has(statusParam)
      ? (db
          .prepare(
            `SELECT r.*, p.name AS author_name, p.email AS author_email
             FROM reviews r
             INNER JOIN profiles p ON p.id = r.user_id
             WHERE r.status = ?
             ORDER BY r.created_at DESC`,
          )
          .all(statusParam) as unknown as ReviewRow[])
      : (db
          .prepare(
            `SELECT r.*, p.name AS author_name, p.email AS author_email
             FROM reviews r
             INNER JOIN profiles p ON p.id = r.user_id
             ORDER BY
               CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
               r.created_at DESC`,
          )
          .all() as unknown as ReviewRow[]);

    const counts = db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM reviews
         GROUP BY status`,
      )
      .all() as Array<{ status: string; count: number }>;

    const summary = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const row of counts) {
      if (row.status === 'pending' || row.status === 'approved' || row.status === 'rejected') {
        summary[row.status] = Number(row.count);
        summary.total += Number(row.count);
      }
    }

    return res.json({
      reviews: rows.map(serializeAdminReview),
      summary,
    });
  });

  app.patch(
    '/api/admin/reviews/:id/status',
    requireAdminAuth,
    (req: AuthRequest, res: Response) => {
      const reviewId = req.params.id;
      const nextStatus = req.body?.status;
      if (nextStatus !== 'approved' && nextStatus !== 'rejected' && nextStatus !== 'pending') {
        return res
          .status(400)
          .json({ error: 'Status must be approved, rejected, or pending.' });
      }

      const now = new Date().toISOString();
      const result = db
        .prepare(
          `UPDATE reviews
           SET status = ?, moderated_by = ?, moderated_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(nextStatus, req.auth!.sub, now, now, reviewId);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      const updated = db
        .prepare(
          `SELECT r.*, p.name AS author_name, p.email AS author_email
           FROM reviews r
           INNER JOIN profiles p ON p.id = r.user_id
           WHERE r.id = ?`,
        )
        .get(reviewId) as unknown as ReviewRow;

      return res.json({ review: serializeAdminReview(updated) });
    },
  );

  app.delete('/api/admin/reviews/:id', requireAdminAuth, (req: AuthRequest, res: Response) => {
    const reviewId = req.params.id;
    const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    return res.json({ ok: true });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const httpServer = http.createServer(app);
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    // AI Studio disables HMR; serve a WebSocket-free Vite client runtime so CSS/module helpers work without failing WS connects.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const parsed = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (parsed.search ? '&' + parsed.search.slice(1) : '') + (parsed.hash || '');
}
export class ErrorOverlay {}
`);
    });

    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ANN BAKERY HOUSE server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

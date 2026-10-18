CREATE TABLE IF NOT EXISTS ph_users (
 id TEXT PRIMARY KEY, nickname TEXT NOT NULL,
 access_enc TEXT NOT NULL, refresh_enc TEXT NOT NULL,
 expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ph_sessions (
 key_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ph_oauth (
 state TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ph_deals (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('official','member')),
 status TEXT NOT NULL CHECK(status IN ('pending','publishing','published','rejected','failed','needs_review')),
 name TEXT NOT NULL, model TEXT NOT NULL, price INTEGER NOT NULL,
 store TEXT NOT NULL, place TEXT NOT NULL, condition TEXT NOT NULL,
 discovered_at TEXT NOT NULL, conditions TEXT NOT NULL,
 stock TEXT NOT NULL, url TEXT NOT NULL, image TEXT,
 fingerprint TEXT NOT NULL UNIQUE, article_url TEXT,
 error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ph_deals_pending ON ph_deals(status,created_at DESC);
CREATE INDEX IF NOT EXISTS ph_deals_user ON ph_deals(user_id,created_at DESC);

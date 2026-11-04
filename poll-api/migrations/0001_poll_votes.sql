-- Each anonymous browser can hold one vote per poll cycle.
-- Poll-specific HMAC hashes avoid storing raw browser IDs, names, or emails.
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(poll_id, voter_hash)
);
CREATE INDEX IF NOT EXISTS poll_votes_by_choice ON poll_votes(poll_id,choice_id);

-- Per-cycle durable ballots. New 21-day cycles get separate poll_id keys.
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, voter_hash)
);
CREATE INDEX IF NOT EXISTS poll_votes_poll_choice
  ON poll_votes(poll_id, choice_id);

CREATE TABLE IF NOT EXISTS links (
  url     TEXT PRIMARY KEY,
  origin  TEXT NOT NULL,
  created TEXT NOT NULL,
  visit   INTEGER NOT NULL DEFAULT 0,
  secret  TEXT
);

-- Cockpit 2027 · zentraler Speicher (wird auch automatisch beim ersten Zugriff angelegt)
CREATE TABLE IF NOT EXISTS dokumente (
  typ TEXT NOT NULL,
  id TEXT NOT NULL,
  daten TEXT NOT NULL,
  version INTEGER NOT NULL,
  aktualisiert_am INTEGER NOT NULL,
  aktualisiert_von TEXT,
  PRIMARY KEY (typ, id)
);
CREATE TABLE IF NOT EXISTS protokoll (
  id TEXT PRIMARY KEY,
  zeit INTEGER NOT NULL,
  wer TEXT,
  typ TEXT,
  dok_id TEXT,
  aktion TEXT,
  zusammenfassung TEXT
);
CREATE INDEX IF NOT EXISTS protokoll_zeit ON protokoll (zeit);

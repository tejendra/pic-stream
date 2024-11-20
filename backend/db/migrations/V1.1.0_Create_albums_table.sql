CREATE TABLE IF NOT EXISTS albums (
  id VARCHAR(10) UNIQUE PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL
);
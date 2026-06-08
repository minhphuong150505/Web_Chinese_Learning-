CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    email         VARCHAR(320) NOT NULL UNIQUE,
    google_sub    VARCHAR(255) NOT NULL UNIQUE,   -- Google's stable subject id ("sub" claim)
    display_name  VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

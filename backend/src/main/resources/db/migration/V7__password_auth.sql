ALTER TABLE users
    ALTER COLUMN google_sub DROP NOT NULL,
    ADD COLUMN password_hash VARCHAR(255);

ALTER TABLE users
    ADD CONSTRAINT users_auth_method_check
        CHECK (google_sub IS NOT NULL OR password_hash IS NOT NULL);

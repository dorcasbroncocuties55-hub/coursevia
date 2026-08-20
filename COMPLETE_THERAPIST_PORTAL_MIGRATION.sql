-- =====================================================
-- COMPLETE THERAPIST PORTAL MIGRATION
-- Run this in Supabase SQL Editor
-- Tables are created first, triggers last to avoid
-- "column does not exist" errors
-- =====================================================


-- =====================================================
-- STEP 1: THERAPY CATEGORIES REFERENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS therapy_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_hipaa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO therapy_categories (id, name, description, requires_hipaa) VALUES
('mental_health',       'Mental Health Therapy',    'Clinical psychology, psychiatry, licensed mental health counseling', TRUE),
('physical_therapy',    'Physical Therapy',          'Physical rehabilitation and movement therapy', TRUE),
('occupational_therapy','Occupational Therapy',      'Daily living skills and occupational rehabilitation', TRUE),
('speech_therapy',      'Speech Therapy',            'Speech and language pathology therapy', TRUE),
('medical_therapy',     'Medical Therapy',           'Other medical or clinical therapy services', TRUE),
('relationship_therapy','Relationship Therapy',      'Marriage, family, and relationship counseling (non-medical)', FALSE),
('life_therapy',        'Life Therapy',              'Personal development and life coaching therapy', FALSE),
('career_therapy',      'Career Therapy',            'Professional development and career counseling', FALSE),
('wellness_therapy',    'Wellness Therapy',          'General wellness and lifestyle therapy', FALSE)
ON CONFLICT (id) DO UPDATE SET
    name         = EXCLUDED.name,
    description  = EXCLUDED.description,
    requires_hipaa = EXCLUDED.requires_hipaa;


-- =====================================================
-- STEP 2: THERAPIST PROFILES TABLE ENHANCEMENTS
-- =====================================================

ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS therapy_category        VARCHAR(50) DEFAULT 'mental_health';
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS headline                TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS bio                     TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS experience              TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS certification           TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS skills                  TEXT[];
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS languages               TEXT[];
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS hourly_rate             NUMERIC(10,2) DEFAULT 0;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS service_delivery_mode   VARCHAR(20)  DEFAULT 'online';
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS is_active               BOOLEAN      DEFAULT true;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS availability_schedule   JSONB;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_bookings":true,"email_messages":true,"email_reminders":true,"sms_bookings":false,"sms_reminders":false}';
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS privacy_settings        JSONB DEFAULT '{"profile_visible":true,"show_phone":false,"show_email":false,"allow_messages":true}';

-- Therapy category check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_therapy_category' AND table_name = 'therapist_profiles'
    ) THEN
        ALTER TABLE therapist_profiles
        ADD CONSTRAINT valid_therapy_category
        CHECK (therapy_category IN (
            'mental_health','physical_therapy','occupational_therapy',
            'speech_therapy','medical_therapy','relationship_therapy',
            'life_therapy','career_therapy','wellness_therapy','general'
        ));
    END IF;
END $$;

-- is_health_related generated column (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'therapist_profiles' AND column_name = 'is_health_related'
    ) THEN
        ALTER TABLE therapist_profiles
        ADD COLUMN is_health_related BOOLEAN
        GENERATED ALWAYS AS (
            therapy_category IN ('mental_health','physical_therapy','occupational_therapy','speech_therapy','medical_therapy')
        ) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_therapist_category ON therapist_profiles(therapy_category);

-- Default any NULL categories
UPDATE therapist_profiles
SET therapy_category = 'mental_health'
WHERE therapy_category IS NULL OR therapy_category = 'general';


-- =====================================================
-- STEP 3: PROFILES TABLE ENHANCEMENTS
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline                   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession                 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience                 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certification              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio                       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills                    TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages                 TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_price             NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_delivery_mode     VARCHAR(20) DEFAULT 'online';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slug              VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id         VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_completed  BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_details_submitted     BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled       BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_status        VARCHAR(20) DEFAULT 'not_connected';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_verified      BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_profile_slug
    ON profiles(profile_slug) WHERE profile_slug IS NOT NULL;


-- =====================================================
-- STEP 4: THERAPIST SERVICES TABLE
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS therapist_services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id    UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    service_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    duration        INTEGER      DEFAULT 60,
    price           NUMERIC(10,2) DEFAULT 0,
    service_type    VARCHAR(50)  DEFAULT 'consultation',
    delivery_mode   VARCHAR(20)  DEFAULT 'online',
    is_active       BOOLEAN      DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS therapist_id  UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS service_name  VARCHAR(255);
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS duration      INTEGER       DEFAULT 60;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS price         NUMERIC(10,2) DEFAULT 0;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS service_type  VARCHAR(50)   DEFAULT 'consultation';
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(20)   DEFAULT 'online';
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS is_active     BOOLEAN       DEFAULT true;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE therapist_services ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_therapist_services_therapist_id ON therapist_services(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_services_active        ON therapist_services(is_active);


-- =====================================================
-- STEP 5: BOOKINGS TABLE ENHANCEMENTS
-- =====================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS therapist_id           UUID REFERENCES therapist_profiles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS learner_id             UUID REFERENCES profiles(user_id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id             UUID REFERENCES therapist_services(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_at           TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration               INTEGER DEFAULT 60;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price                  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status                 VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_delivery_mode  VARCHAR(20) DEFAULT 'online';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes                  TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_link           TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location               TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_therapist_id  ON bookings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_learner_id    ON bookings(learner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at  ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON bookings(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_booking_status' AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT valid_booking_status
        CHECK (status IN ('pending','confirmed','completed','cancelled','no_show'));
    END IF;
END $$;


-- =====================================================
-- STEP 6: SESSION NOTES TABLE
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS session_notes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID REFERENCES bookings(id)           ON DELETE CASCADE,
    therapist_id            UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    patient_id              UUID REFERENCES profiles(user_id)      ON DELETE CASCADE,
    session_date            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    objectives              TEXT,
    interventions           TEXT,
    patient_response        TEXT,
    homework_assigned       TEXT,
    next_session_goals      TEXT,
    mood_assessment         VARCHAR(20) DEFAULT 'fair',
    progress_rating         INTEGER     DEFAULT 5,
    risk_assessment         VARCHAR(20) DEFAULT 'low',
    medications_discussed   BOOLEAN     DEFAULT false,
    crisis_plan_reviewed    BOOLEAN     DEFAULT false,
    confidentiality_concerns TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS booking_id               UUID REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS therapist_id             UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS patient_id               UUID REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS session_date             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS objectives               TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS interventions            TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS patient_response         TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS homework_assigned        TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS next_session_goals       TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS mood_assessment          VARCHAR(20) DEFAULT 'fair';
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS progress_rating          INTEGER     DEFAULT 5;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS risk_assessment          VARCHAR(20) DEFAULT 'low';
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS medications_discussed    BOOLEAN     DEFAULT false;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS crisis_plan_reviewed     BOOLEAN     DEFAULT false;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS confidentiality_concerns TEXT;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_session_notes_booking_id   ON session_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_therapist_id ON session_notes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_patient_id   ON session_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session_date ON session_notes(session_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_mood_assessment' AND table_name = 'session_notes'
    ) THEN
        ALTER TABLE session_notes
        ADD CONSTRAINT valid_mood_assessment
        CHECK (mood_assessment IN ('poor','fair','good','excellent'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_progress_rating' AND table_name = 'session_notes'
    ) THEN
        ALTER TABLE session_notes
        ADD CONSTRAINT valid_progress_rating
        CHECK (progress_rating >= 1 AND progress_rating <= 10);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_risk_assessment' AND table_name = 'session_notes'
    ) THEN
        ALTER TABLE session_notes
        ADD CONSTRAINT valid_risk_assessment
        CHECK (risk_assessment IN ('low','moderate','high'));
    END IF;
END $$;


-- =====================================================
-- STEP 7: MESSAGES TABLE
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    receiver_id     UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    message_type    VARCHAR(20)  DEFAULT 'text',
    is_read         BOOLEAN      DEFAULT false,
    is_encrypted    BOOLEAN      DEFAULT false,
    attachment_url  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id      UUID REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id    UUID REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content        TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type   VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read        BOOLEAN     DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted   BOOLEAN     DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read     ON messages(is_read);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_message_type' AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages
        ADD CONSTRAINT valid_message_type
        CHECK (message_type IN ('text','appointment','document','system','custom_offer'));
    END IF;
END $$;


-- =====================================================
-- STEP 8: WALLETS TABLE ENHANCEMENTS
-- =====================================================

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id           UUID REFERENCES auth.users(id);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_earnings    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency          VARCHAR(3)    DEFAULT 'USD';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);


-- =====================================================
-- STEP 9: WALLET TRANSACTIONS TABLE
-- (Create the table BEFORE any trigger references it)
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID REFERENCES wallets(id)      ON DELETE CASCADE,
    user_id          UUID REFERENCES auth.users(id)   ON DELETE CASCADE,
    booking_id       UUID REFERENCES bookings(id)     ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount           NUMERIC(12,2) NOT NULL,
    currency         VARCHAR(3)    DEFAULT 'USD',
    status           VARCHAR(20)   DEFAULT 'completed',
    description      TEXT,
    reference_id     VARCHAR(255),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If table already existed without these columns, add them now
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS amount           NUMERIC(12,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id        UUID REFERENCES wallets(id) ON DELETE CASCADE;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS currency         VARCHAR(3)    DEFAULT 'USD';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status           VARCHAR(20)   DEFAULT 'completed';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description      TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id     VARCHAR(255);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id   ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id     ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type        ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status      ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at  ON wallet_transactions(created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_transaction_type' AND table_name = 'wallet_transactions'
    ) THEN
        ALTER TABLE wallet_transactions
        ADD CONSTRAINT valid_transaction_type
        CHECK (transaction_type IN ('earning','payout','refund','fee'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_transaction_status' AND table_name = 'wallet_transactions'
    ) THEN
        ALTER TABLE wallet_transactions
        ADD CONSTRAINT valid_transaction_status
        CHECK (status IN ('pending','completed','failed'));
    END IF;
END $$;


-- =====================================================
-- STEP 10: PAYOUT REQUESTS TABLE
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS payout_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES auth.users(id)  ON DELETE CASCADE,
    wallet_id             UUID REFERENCES wallets(id)     ON DELETE CASCADE,
    amount                NUMERIC(12,2) NOT NULL,
    currency              VARCHAR(3)    DEFAULT 'USD',
    stripe_account_id     VARCHAR(255),
    stripe_transfer_id    VARCHAR(255),
    stripe_payout_id      VARCHAR(255),
    payout_method         JSONB DEFAULT '{"type":"stripe_connect"}',
    status                VARCHAR(20)   DEFAULT 'pending',
    requested_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at          TIMESTAMP WITH TIME ZONE,
    processed_by          UUID REFERENCES auth.users(id),
    rejection_reason      TEXT,
    stripe_transfer_status VARCHAR(20),
    stripe_payout_status  VARCHAR(20),
    estimated_arrival     TIMESTAMP WITH TIME ZONE,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patch any existing payout_requests table that is missing columns
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS wallet_id              UUID REFERENCES wallets(id) ON DELETE CASCADE;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS amount                 NUMERIC(12,2);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS currency               VARCHAR(3)    DEFAULT 'USD';
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_account_id      VARCHAR(255);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_transfer_id     VARCHAR(255);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_payout_id       VARCHAR(255);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS payout_method          JSONB DEFAULT '{"type":"stripe_connect"}';
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS status                 VARCHAR(20)   DEFAULT 'pending';
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS requested_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS processed_at           TIMESTAMP WITH TIME ZONE;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS processed_by           UUID REFERENCES auth.users(id);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS rejection_reason       TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_transfer_status VARCHAR(20);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_payout_status   VARCHAR(20);
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS estimated_arrival      TIMESTAMP WITH TIME ZONE;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id      ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status       ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_payout_status' AND table_name = 'payout_requests'
    ) THEN
        ALTER TABLE payout_requests
        ADD CONSTRAINT valid_payout_status
        CHECK (status IN ('pending','processing','completed','rejected'));
    END IF;
END $$;


-- =====================================================
-- STEP 11: THERAPIST CATEGORY AUDIT TABLE
-- If the table already exists, ensure all columns are present
-- =====================================================

CREATE TABLE IF NOT EXISTS therapist_category_changes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id  UUID REFERENCES therapist_profiles(id),
    old_category  VARCHAR(50),
    new_category  VARCHAR(50),
    changed_by    UUID REFERENCES auth.users(id),
    reason        TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES therapist_profiles(id);
ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS old_category  VARCHAR(50);
ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS new_category  VARCHAR(50);
ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS changed_by    UUID REFERENCES auth.users(id);
ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS reason        TEXT;
ALTER TABLE therapist_category_changes ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_therapist_category_changes_therapist_id ON therapist_category_changes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_category_changes_created_at   ON therapist_category_changes(created_at);


-- =====================================================
-- STEP 12: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE therapy_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_category_changes   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read therapy categories' AND tablename = 'therapy_categories') THEN
        CREATE POLICY "Anyone can read therapy categories"
        ON therapy_categories FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Therapists can manage their own services' AND tablename = 'therapist_services') THEN
        CREATE POLICY "Therapists can manage their own services"
        ON therapist_services FOR ALL
        USING (therapist_id IN (SELECT id FROM therapist_profiles WHERE user_id = auth.uid()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Therapists can manage session notes' AND tablename = 'session_notes') THEN
        CREATE POLICY "Therapists can manage session notes"
        ON session_notes FOR ALL
        USING (
            therapist_id IN (SELECT id FROM therapist_profiles WHERE user_id = auth.uid())
            OR patient_id = auth.uid()
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own wallet transactions' AND tablename = 'wallet_transactions') THEN
        CREATE POLICY "Users can view their own wallet transactions"
        ON wallet_transactions FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own payout requests' AND tablename = 'payout_requests') THEN
        CREATE POLICY "Users can manage their own payout requests"
        ON payout_requests FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Therapists can view their own category changes' AND tablename = 'therapist_category_changes') THEN
        CREATE POLICY "Therapists can view their own category changes"
        ON therapist_category_changes FOR SELECT
        USING (therapist_id IN (SELECT id FROM therapist_profiles WHERE user_id = auth.uid()));
    END IF;
END $$;


-- =====================================================
-- STEP 13: FUNCTIONS
-- (Defined before triggers that call them)
-- =====================================================

-- Generic updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Category change audit function
CREATE OR REPLACE FUNCTION log_therapist_category_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.therapy_category IS DISTINCT FROM NEW.therapy_category THEN
        INSERT INTO therapist_category_changes (therapist_id, old_category, new_category, changed_by)
        VALUES (NEW.id, OLD.therapy_category, NEW.therapy_category, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wallet balance function
-- Safely references NEW.transaction_type, NEW.amount, NEW.status, NEW.wallet_id
-- These columns are guaranteed to exist after Step 9 ALTER TABLE statements above
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_type   TEXT;
    v_amount NUMERIC;
    v_status TEXT;
BEGIN
    v_type   := NEW.transaction_type;
    v_amount := NEW.amount;
    v_status := NEW.status;

    IF v_status = 'completed' THEN
        UPDATE wallets
        SET
            available_balance = available_balance +
                CASE
                    WHEN v_type IN ('earning','refund') THEN  v_amount
                    WHEN v_type IN ('payout','fee')     THEN -v_amount
                    ELSE 0
                END,
            total_earnings = total_earnings +
                CASE
                    WHEN v_type = 'earning' THEN v_amount
                    ELSE 0
                END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- STEP 14: TRIGGERS
-- (Always last — tables and functions must exist first)
-- =====================================================

DROP TRIGGER IF EXISTS therapist_category_change_log ON therapist_profiles;
CREATE TRIGGER therapist_category_change_log
    AFTER UPDATE ON therapist_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_therapist_category_change();

DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON wallet_transactions;
CREATE TRIGGER update_wallet_balance_trigger
    AFTER INSERT OR UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

DROP TRIGGER IF EXISTS update_therapist_services_updated_at ON therapist_services;
CREATE TRIGGER update_therapist_services_updated_at
    BEFORE UPDATE ON therapist_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- STEP 15: SAMPLE DATA
-- =====================================================

-- Default service for therapists who have none
INSERT INTO therapist_services (therapist_id, service_name, description, duration, price, service_type, delivery_mode)
SELECT
    id,
    'Individual Therapy Session',
    'One-on-one therapy session tailored to your specific needs',
    60,
    120.00,
    'therapy',
    'both'
FROM therapist_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_services ts WHERE ts.therapist_id = therapist_profiles.id
)
ON CONFLICT DO NOTHING;

-- Create wallets for therapists/coaches who don't have one
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings)
SELECT
    p.user_id,
    0, 0, 0
FROM profiles p
WHERE p.role IN ('therapist','coach')
  AND NOT EXISTS (
      SELECT 1 FROM wallets w WHERE w.user_id = p.user_id
  )
ON CONFLICT DO NOTHING;


-- =====================================================
-- STEP 16: VIEWS & GRANTS
-- =====================================================

CREATE OR REPLACE VIEW therapist_dashboard_stats AS
SELECT
    tp.user_id,
    tp.id                                                                    AS therapist_id,
    COUNT(DISTINCT b.learner_id)                                             AS total_patients,
    COUNT(CASE WHEN b.status = 'completed'                            THEN 1 END) AS completed_sessions,
    COUNT(CASE WHEN DATE(b.scheduled_at) = CURRENT_DATE
                AND b.status = 'confirmed'                            THEN 1 END) AS today_sessions,
    COALESCE(w.available_balance, 0)                                         AS wallet_balance,
    COUNT(CASE WHEN m.receiver_id = tp.user_id AND m.is_read = false  THEN 1 END) AS unread_messages
FROM therapist_profiles tp
LEFT JOIN bookings b         ON b.therapist_id = tp.id
LEFT JOIN wallets w          ON w.user_id = tp.user_id
LEFT JOIN messages m         ON m.receiver_id = tp.user_id AND m.is_read = false
GROUP BY tp.user_id, tp.id, w.available_balance;

COMMENT ON VIEW therapist_dashboard_stats IS 'Dashboard statistics for the therapist portal';

GRANT SELECT      ON therapy_categories          TO authenticated;
GRANT ALL         ON therapist_services          TO authenticated;
GRANT ALL         ON session_notes               TO authenticated;
GRANT SELECT      ON wallet_transactions         TO authenticated;
GRANT ALL         ON payout_requests             TO authenticated;
GRANT SELECT      ON therapist_category_changes  TO authenticated;
GRANT SELECT      ON therapist_dashboard_stats   TO authenticated;


-- =====================================================
-- DONE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✓ therapy_categories';
    RAISE NOTICE '✓ therapist_profiles enhanced';
    RAISE NOTICE '✓ profiles enhanced (Stripe Connect columns)';
    RAISE NOTICE '✓ therapist_services';
    RAISE NOTICE '✓ bookings enhanced';
    RAISE NOTICE '✓ session_notes';
    RAISE NOTICE '✓ messages';
    RAISE NOTICE '✓ wallets enhanced';
    RAISE NOTICE '✓ wallet_transactions';
    RAISE NOTICE '✓ payout_requests';
    RAISE NOTICE '✓ therapist_category_changes';
    RAISE NOTICE '✓ RLS policies, functions, triggers, views, grants';
    RAISE NOTICE 'THERAPIST PORTAL MIGRATION COMPLETE';
END $$;

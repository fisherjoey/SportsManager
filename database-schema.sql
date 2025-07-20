-- Sports Management App Database Schema
-- PostgreSQL/MySQL compatible

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'referee') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referees table
CREATE TABLE referees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    level ENUM('Recreational', 'Competitive', 'Elite') NOT NULL,
    location VARCHAR(255),
    postal_code VARCHAR(10) NOT NULL,
    max_distance INTEGER DEFAULT 25,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table (simplified to Referee 1, 2, 3)
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    home_team_name VARCHAR(255) NOT NULL,
    away_team_name VARCHAR(255) NOT NULL,
    game_date DATE NOT NULL,
    game_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    level ENUM('Recreational', 'Competitive', 'Elite') NOT NULL,
    pay_rate DECIMAL(10,2) NOT NULL,
    status ENUM('assigned', 'unassigned', 'up-for-grabs', 'completed', 'cancelled') DEFAULT 'unassigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game assignments table
CREATE TABLE game_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    referee_id UUID REFERENCES referees(id) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    status ENUM('assigned', 'accepted', 'declined', 'completed') DEFAULT 'assigned',
    UNIQUE(game_id, position_id), -- Only one referee per position per game
    UNIQUE(game_id, referee_id)   -- One referee can't have multiple positions in same game
);

-- Seed data for positions
INSERT INTO positions (name, description) VALUES
('Referee 1', 'Primary Referee'),
('Referee 2', 'Secondary Referee'),
('Referee 3', 'Third Referee (Optional)');

-- Indexes for performance
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_level ON games(level);
CREATE INDEX idx_games_postal_code ON games(postal_code);
CREATE INDEX idx_referees_level ON referees(level);
CREATE INDEX idx_referees_postal_code ON referees(postal_code);
CREATE INDEX idx_referees_available ON referees(is_available);
CREATE INDEX idx_game_assignments_game ON game_assignments(game_id);
CREATE INDEX idx_game_assignments_referee ON game_assignments(referee_id);
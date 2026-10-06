-- Nobatyar / Moradipsy — MySQL schema (PHP 8.1 backend)
-- Charset utf8mb4 for full Persian support. Mirrors the old Flask/SQLAlchemy models.
-- Safe to run on an empty database. Run once, then migrate data with scripts/migrate_sqlite_to_mysql.php.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  national_id VARCHAR(20) NOT NULL UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'patient',
  password_hash VARCHAR(200) NULL,
  underlying_diseases TEXT NULL,
  created_at DATETIME NULL,
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  INDEX idx_otp_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Short OTP sessions for comment / feedback / seminar flows.
-- (The Flask app kept these in per-process memory; PHP is per-request, so they live in the DB.)
CREATE TABLE IF NOT EXISTS otp_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  scope VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  UNIQUE KEY uq_otp_sessions (phone, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weekday INT NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  visit_duration INT NOT NULL DEFAULT 20
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS closed_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  closed_date VARCHAR(10) NOT NULL,
  reason VARCHAR(200) NULL,
  created_at DATETIME NULL,
  INDEX idx_closed_date (closed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  image VARCHAR(300) NULL,
  author_id INT NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_posts_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  appointment_date VARCHAR(10) NOT NULL,
  appointment_time VARCHAR(5) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NULL,
  reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_appt_patient (patient_id),
  INDEX idx_appt_date (appointment_date),
  INDEX idx_appt_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_id INT NULL,
  visit_date VARCHAR(10) NOT NULL,
  chief_complaint TEXT NULL,
  history TEXT NULL,
  diagnosis TEXT NULL,
  treatment_plan TEXT NULL,
  medications TEXT NULL,
  insurance_company VARCHAR(100) NULL,
  insurance_type VARCHAR(100) NULL,
  notes TEXT NULL,
  images TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_mr_patient (patient_id),
  INDEX idx_mr_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  parent_id INT NULL,
  INDEX idx_comments_post (post_id),
  INDEX idx_comments_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  content TEXT NOT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seminar_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_student TINYINT(1) NOT NULL DEFAULT 0,
  field_of_study VARCHAR(200) NULL,
  semester VARCHAR(50) NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

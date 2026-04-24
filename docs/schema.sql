SET NAMES utf8mb4;
SET foreign_key_checks = 0;

CREATE TABLE users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(30)  DEFAULT NULL,
  full_name     VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('PASSENGER','DRIVER','BOTH','ADMIN') NOT NULL DEFAULT 'PASSENGER',
  status        ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  avatar_url    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE driver_profiles (
  id                  VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id             VARCHAR(36) NOT NULL UNIQUE,
  tier                ENUM('BASIC','VERIFIED') NOT NULL DEFAULT 'BASIC',
  verification_status ENUM('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
  avg_rating          DECIMAL(3,2) DEFAULT NULL,
  total_trips         INT NOT NULL DEFAULT 0,
  car_make            VARCHAR(100) DEFAULT NULL,
  car_model           VARCHAR(100) DEFAULT NULL,
  car_year            SMALLINT    DEFAULT NULL,
  car_plate           VARCHAR(20)  DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE driver_documents (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  driver_id      VARCHAR(36)  NOT NULL,
  type           ENUM('LICENSE','INSURANCE','ID') NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  status         ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  rejection_note TEXT DEFAULT NULL,
  reviewed_at    DATETIME DEFAULT NULL,
  uploaded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE routes (
  id              VARCHAR(36)    NOT NULL PRIMARY KEY,
  driver_id       VARCHAR(36)    NOT NULL,
  total_seats     TINYINT        NOT NULL,
  price_per_seat  DECIMAL(8,2)   NOT NULL,
  depart_time     TIME           NOT NULL,
  recurrence      JSON           NOT NULL,
  valid_from      DATE           NOT NULL,
  valid_until     DATE           DEFAULT NULL,
  notes           TEXT           DEFAULT NULL,
  status          ENUM('ACTIVE','PAUSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE route_stops (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  route_id    VARCHAR(36)  NOT NULL,
  stop_order  TINYINT      NOT NULL,
  label       VARCHAR(100) DEFAULT NULL,
  address     VARCHAR(300) NOT NULL,
  lat         DECIMAL(10,7) NOT NULL,
  lng         DECIMAL(10,7) NOT NULL,
  is_optional TINYINT(1)   NOT NULL DEFAULT 0,
  FOREIGN KEY (route_id) REFERENCES routes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE route_occurrences (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  route_id    VARCHAR(36) NOT NULL,
  date        DATE        NOT NULL,
  status      ENUM('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  seats_taken TINYINT     NOT NULL DEFAULT 0,
  UNIQUE KEY uq_route_date (route_id, date),
  FOREIGN KEY (route_id) REFERENCES routes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
  id               VARCHAR(36)  NOT NULL PRIMARY KEY,
  occurrence_id    VARCHAR(36)  NOT NULL,
  passenger_id     VARCHAR(36)  NOT NULL,
  pickup_stop_id   VARCHAR(36)  NOT NULL,
  dropoff_stop_id  VARCHAR(36)  NOT NULL,
  status           ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED_PASSENGER','CANCELLED_DRIVER','NO_SHOW') NOT NULL DEFAULT 'PENDING',
  seats_booked     TINYINT      NOT NULL DEFAULT 1,
  price_per_seat   DECIMAL(8,2) NOT NULL,
  total_amount     DECIMAL(8,2) NOT NULL,
  service_fee      DECIMAL(8,2) NOT NULL DEFAULT 0,
  note_to_driver   TEXT         DEFAULT NULL,
  cancelled_at     DATETIME     DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (occurrence_id)   REFERENCES route_occurrences(id),
  FOREIGN KEY (passenger_id)    REFERENCES users(id),
  FOREIGN KEY (pickup_stop_id)  REFERENCES route_stops(id),
  FOREIGN KEY (dropoff_stop_id) REFERENCES route_stops(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  booking_id   VARCHAR(36)  NOT NULL,
  amount       DECIMAL(8,2) NOT NULL,
  status       ENUM('PENDING','COMPLETED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  completed_at DATETIME DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  booking_id  VARCHAR(36) NOT NULL,
  reviewer_id VARCHAR(36) NOT NULL,
  reviewee_id VARCHAR(36) NOT NULL,
  direction   ENUM('PASSENGER_TO_DRIVER','DRIVER_TO_PASSENGER') NOT NULL,
  rating      TINYINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT        DEFAULT NULL,
  tags        JSON        DEFAULT NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_booking_reviewer (booking_id, reviewer_id),
  FOREIGN KEY (booking_id)  REFERENCES bookings(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, email, full_name, password_hash, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@boleia.pt', 'Administrador',
   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN', 'ACTIVE');

SET foreign_key_checks = 1;

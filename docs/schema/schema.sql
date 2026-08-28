-- =====================================================================
-- 제품 AS/고객센터 운영관리 시스템 — 전체 스키마 (오케스트레이터 소유, 읽기 전용)
-- 각 도메인 에이전트는 자신의 테이블만 WRITE 가능. 타 도메인 테이블은 조회(JOIN)만 허용,
-- 쓰기는 반드시 이벤트/서비스 인터페이스를 통해서만 수행한다.
-- =====================================================================

-- ---------- AUTH 도메인 (선행 완료 가정) ----------
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('AGENT','ENGINEER','ADMIN','CUSTOMER')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CUSTOMER 도메인 ----------
CREATE TABLE customers (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    phone         VARCHAR(30)  NOT NULL,
    email         VARCHAR(255),
    address       VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    customer_id    BIGINT NOT NULL REFERENCES customers(id),
    model_name     VARCHAR(100) NOT NULL,
    serial_no      VARCHAR(100) NOT NULL UNIQUE,
    purchased_at   DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TICKET 도메인 (ticket-impl-agent 소유, 이번 스프린트 상세 구현) ----------
CREATE TABLE tickets (
    id                BIGSERIAL PRIMARY KEY,
    ticket_no         VARCHAR(20) NOT NULL UNIQUE,          -- 예: AS-20260820-0001
    customer_id       BIGINT NOT NULL REFERENCES customers(id),
    product_id        BIGINT REFERENCES products(id),
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    channel           VARCHAR(20) NOT NULL CHECK (channel IN ('PHONE','WEB','APP','EMAIL')),
    priority          VARCHAR(10) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    status            VARCHAR(20) NOT NULL DEFAULT 'RECEIVED'
                        CHECK (status IN ('RECEIVED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED','HOLD')),
    assigned_engineer_id BIGINT REFERENCES users(id),
    created_by        BIGINT NOT NULL REFERENCES users(id),   -- 접수 처리한 상담원
    sla_due_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_engineer ON tickets(assigned_engineer_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

CREATE TABLE ticket_status_history (
    id            BIGSERIAL PRIMARY KEY,
    ticket_id     BIGINT NOT NULL REFERENCES tickets(id),
    from_status   VARCHAR(20),
    to_status     VARCHAR(20) NOT NULL,
    changed_by    BIGINT NOT NULL REFERENCES users(id),
    reason        VARCHAR(500),
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_history_ticket ON ticket_status_history(ticket_id);

-- ---------- DISPATCH 도메인 (다음 스프린트) ----------
CREATE TABLE dispatch_assignments (
    id            BIGSERIAL PRIMARY KEY,
    ticket_id     BIGINT NOT NULL REFERENCES tickets(id),
    engineer_id   BIGINT NOT NULL REFERENCES users(id),
    scheduled_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- INVENTORY 도메인 (다음 스프린트) ----------
CREATE TABLE parts (
    id           BIGSERIAL PRIMARY KEY,
    part_no      VARCHAR(50) NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL,
    stock_qty    INT NOT NULL DEFAULT 0
);

CREATE TABLE part_movements (
    id           BIGSERIAL PRIMARY KEY,
    part_id      BIGINT NOT NULL REFERENCES parts(id),
    ticket_id    BIGINT REFERENCES tickets(id),
    qty_change   INT NOT NULL,          -- 음수: 출고, 양수: 입고
    reason       VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- NOTIFY 도메인 (다음 스프린트) ----------
CREATE TABLE notification_logs (
    id           BIGSERIAL PRIMARY KEY,
    ticket_id    BIGINT REFERENCES tickets(id),
    channel      VARCHAR(20) NOT NULL CHECK (channel IN ('SMS','EMAIL','PUSH')),
    template     VARCHAR(50) NOT NULL,
    sent_at      TIMESTAMPTZ,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED'))
);

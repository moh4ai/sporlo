-- Phase 9.2 — Order buyer name
-- Captures the recipient name at checkout so clubs can print shipping labels
-- without scraping the address blob. Nullable for backwards compatibility
-- with historical orders.

alter table public.orders
  add column if not exists buyer_name text;

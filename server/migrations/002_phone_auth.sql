-- Adds phone + OTP login alongside the existing email/password and Google flows.

alter table users alter column email drop not null;
alter table users add column if not exists phone text unique;
alter table users add column if not exists phone_verified boolean not null default false;

-- A user needs at least one way to be identified/contacted.
alter table users add constraint users_identity_check check (email is not null or phone is not null);

create table if not exists phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists phone_otps_phone_idx on phone_otps (phone);

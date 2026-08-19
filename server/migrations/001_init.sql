-- MathFlow backend schema (replaces base44's hosted auth + entities)
-- Run against a Postgres 14+ database (Cloud SQL for Postgres).

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,               -- null for Google-only accounts
  google_id text unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists email_otps_email_idx on email_otps (email);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_user_idx on password_reset_tokens (user_id);

create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references users (id) on delete cascade,
  age integer,
  grade_level text,
  country text,
  syllabus text,
  language text default 'English',
  goals text,
  use_case text,
  preferred_explanation_style text default 'step-by-step',
  current_topic text,
  overall_mastery numeric,
  onboarding_complete boolean not null default false,
  session_state jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists student_profiles_owner_idx on student_profiles (created_by_id);

create table if not exists topic_masteries (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references users (id) on delete cascade,
  topic text not null,
  subtopic text,
  mastery_score numeric,
  questions_attempted integer not null default 0,
  questions_correct integer not null default 0,
  consecutive_failures integer not null default 0,
  difficulty_level text default 'beginner',
  status text default 'not_started',
  last_practiced timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists topic_masteries_owner_idx on topic_masteries (created_by_id);

create table if not exists study_guides (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references users (id) on delete cascade,
  version integer not null default 1,
  status text not null default 'pending',
  subject_id uuid,
  strengths jsonb not null default '[]',
  gaps jsonb not null default '[]',
  next_topics jsonb not null default '[]',
  plan_details text,
  student_feedback text,
  weekly_idea text,
  weekly_review text,
  last_review_date timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists study_guides_owner_idx on study_guides (created_by_id);

create table if not exists practice_questions (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references users (id) on delete cascade,
  topic text not null,
  subtopic text,
  difficulty text,
  question_text text not null,
  correct_answer text,
  student_answer text,
  is_correct boolean,
  explanation text,
  hints text,
  session_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists practice_questions_owner_idx on practice_questions (created_by_id);

-- Shared reuse pool of AI-generated / textbook questions. Not owned per-user:
-- created_by_id records who first added it, but reads are unscoped so any
-- student can be served an already-generated question for the same topic.
create table if not exists problem_bank (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references users (id) on delete set null,
  topic text not null,
  subtopic text,
  difficulty text default 'beginner',
  question_text text not null,
  correct_answer text,
  solution_steps text,
  hints text,
  language text default 'English',
  subject_id uuid,
  source text default 'ai',
  times_used integer not null default 0,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists problem_bank_topic_idx on problem_bank (topic, subtopic, difficulty);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references users (id) on delete cascade,
  name text not null,
  subject_type text not null default 'custom',
  grade_level text,
  description text,
  color text,
  country text,
  language text default 'English',
  topics jsonb not null default '[]',
  textbook_url text,
  textbook_title text,
  syllabus_url text,
  youtube_videos_url text,
  placement_completed boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists subjects_owner_idx on subjects (created_by_id);

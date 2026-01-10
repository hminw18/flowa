create table if not exists users (
  user_id text primary key,
  username text not null unique,
  native_language text not null,
  learning_language text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id text primary key,
  user_id text not null references users(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  is_active boolean not null default false
);

create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists rooms (
  room_id text primary key,
  room_type text not null,
  name text,
  direct_key text unique,
  created_by text references users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_type_idx on rooms (room_type);

create table if not exists room_members (
  room_id text not null references rooms(room_id) on delete cascade,
  user_id text not null references users(user_id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists room_members_user_idx on room_members (user_id);

create table if not exists messages (
  message_id text primary key,
  room_id text not null references rooms(room_id) on delete cascade,
  sender_user_id text not null references users(user_id) on delete cascade,
  sender_username text not null,
  original_text text not null,
  original_language text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on messages (room_id, created_at);

create table if not exists translations (
  message_id text not null references messages(message_id) on delete cascade,
  target_language text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, target_language)
);

create index if not exists translations_message_idx on translations (message_id);

create table if not exists message_reads (
  room_id text not null references rooms(room_id) on delete cascade,
  message_id text not null references messages(message_id) on delete cascade,
  user_id text not null references users(user_id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_room_idx on message_reads (room_id);

create table if not exists translation_opens (
  room_id text not null references rooms(room_id) on delete cascade,
  message_id text not null references messages(message_id) on delete cascade,
  user_id text not null references users(user_id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (room_id, message_id, user_id)
);

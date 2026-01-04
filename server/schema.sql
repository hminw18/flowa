create table if not exists rooms (
  room_id text primary key,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

create table if not exists messages (
  message_id text primary key,
  room_id text not null references rooms(room_id) on delete cascade,
  sender_client_id text not null,
  sender_username text not null,
  original_text text not null,
  created_at bigint not null,
  translation_status text not null,
  translated_text text,
  highlight_start integer,
  highlight_end integer
);

create index if not exists messages_room_created_idx on messages (room_id, created_at);

create table if not exists translation_opens (
  room_id text not null references rooms(room_id) on delete cascade,
  message_id text not null references messages(message_id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (room_id, message_id)
);

create extension if not exists vector with schema public;
create table if not exists processed_urls (
    id serial primary key,
    url varchar not null unique,
    created_at timestamp with time zone default now()
);

create table if not exists public.portfolio_content (
	id text primary key check (id = 'portfolio'),
	content jsonb not null default '{"projects":[],"updates":[],"photos":[],"videos":[],"cv":null,"cvProfile":{}}'::jsonb,
	updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"portfolio_admin":true}'::jsonb
where lower(email) = lower('tbbbaraka@gmail.com');

drop policy if exists portfolio_content_public_read on public.portfolio_content;
create policy portfolio_content_public_read
	on public.portfolio_content for select to anon, authenticated using (true);

drop policy if exists portfolio_content_admin_insert on public.portfolio_content;
create policy portfolio_content_admin_insert
	on public.portfolio_content for insert to authenticated
	with check (
		lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

drop policy if exists portfolio_content_admin_update on public.portfolio_content;
create policy portfolio_content_admin_update
	on public.portfolio_content for update to authenticated
	using (
		lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	)
	with check (
		lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

drop policy if exists portfolio_content_admin_delete on public.portfolio_content;
create policy portfolio_content_admin_delete
	on public.portfolio_content for delete to authenticated
	using (
		lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

insert into public.portfolio_content (id)
values ('portfolio')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'portfolio-media',
	'portfolio-media',
	true,
	157286400,
	array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists portfolio_media_public_read on storage.objects;
create policy portfolio_media_public_read
	on storage.objects for select to anon, authenticated
	using (bucket_id = 'portfolio-media');

drop policy if exists portfolio_media_admin_insert on storage.objects;
create policy portfolio_media_admin_insert
	on storage.objects for insert to authenticated
	with check (
		bucket_id = 'portfolio-media'
		and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

drop policy if exists portfolio_media_admin_update on storage.objects;
create policy portfolio_media_admin_update
	on storage.objects for update to authenticated
	using (
		bucket_id = 'portfolio-media'
		and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	)
	with check (
		bucket_id = 'portfolio-media'
		and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

drop policy if exists portfolio_media_admin_delete on storage.objects;
create policy portfolio_media_admin_delete
	on storage.objects for delete to authenticated
	using (
		bucket_id = 'portfolio-media'
		and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('tbbbaraka@gmail.com')
		and coalesce(auth.jwt() -> 'app_metadata' ->> 'portfolio_admin', 'false') = 'true'
	);

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'portfolio_content'
	) then
		alter publication supabase_realtime add table public.portfolio_content;
	end if;
end
$$;
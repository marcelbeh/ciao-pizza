-- P1's complete aggregate is committed atomically: dough plans, profile snapshots,
-- recipe records and settings. This avoids partial multi-table migration/sync writes.
create table public.ciao_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  constraint ciao_document_v1 check (coalesce((
    jsonb_typeof(document) = 'object'
    and document->>'version' = '1'
    and jsonb_typeof(document->'dough') = 'object'
    and document->'dough'->>'version' = '1'
    and jsonb_typeof(document->'dough'->'profiles') = 'array'
    and jsonb_typeof(document->'recipes') = 'array'
    and jsonb_typeof(document->'settings') = 'object'
    and jsonb_typeof(document->'imports') = 'array'
    and octet_length(document::text) <= 2097152
    and document ?& array['version','dough','recipes','settings','imports']
  ), false))
);
-- Lightweight idempotency receipts make a lost HTTP acknowledgement safe to retry.
create table public.ciao_sync_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  revision bigint not null check (revision > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);
-- Full originals for local imports and conflict merges; never silently discarded.
create table public.ciao_import_backups (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null check (length(source_key) between 1 and 150),
  payload jsonb not null check (octet_length(payload::text) <= 6291456),
  created_at timestamptz not null default now(),
  primary key (user_id, source_key)
);

alter table public.ciao_workspaces enable row level security;
alter table public.ciao_sync_receipts enable row level security;
alter table public.ciao_import_backups enable row level security;

-- Explicit grants: no anonymous API access, no public table deletion.
revoke all on public.ciao_workspaces, public.ciao_sync_receipts, public.ciao_import_backups from anon, authenticated;
grant select, insert, update on public.ciao_workspaces to authenticated;
grant select, insert on public.ciao_sync_receipts, public.ciao_import_backups to authenticated;

create policy workspace_owner on public.ciao_workspaces for all to authenticated
  using ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false))
  with check ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false));
create policy receipt_owner on public.ciao_sync_receipts for all to authenticated
  using ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false))
  with check ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false));
create policy backup_owner on public.ciao_import_backups for all to authenticated
  using ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false))
  with check ((select auth.uid()) = user_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false));

create function public.ciao_commit_workspace(
  p_user_id uuid,
  p_document jsonb,
  p_expected_revision bigint,
  p_mutation_id uuid,
  p_archive_key text default null,
  p_archive jsonb default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
  acknowledged_revision bigint;
begin
  if owner_id is null or owner_id is distinct from p_user_id
     or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'CIAO_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_expected_revision < 0 or p_mutation_id is null or p_document is null then
    raise exception 'CIAO_INVALID_COMMIT' using errcode = '22023';
  end if;
  if (p_archive_key is null) <> (p_archive is null) then
    raise exception 'CIAO_INVALID_ARCHIVE' using errcode = '22023';
  end if;
  insert into public.ciao_workspaces(user_id, document)
    values(owner_id, '{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb)
    on conflict(user_id) do nothing;
  select w.revision into current_revision from public.ciao_workspaces w
    where w.user_id = owner_id for update;
  select r.revision into acknowledged_revision from public.ciao_sync_receipts r
    where r.user_id = owner_id and r.mutation_id = p_mutation_id;
  if found then
    return jsonb_build_object('revision', acknowledged_revision);
  end if;
  if current_revision is distinct from p_expected_revision then
    raise exception 'CIAO_CONFLICT' using errcode = '40001';
  end if;
  update public.ciao_workspaces set document=p_document, revision=current_revision+1, updated_at=now()
    where user_id=owner_id;
  insert into public.ciao_sync_receipts(user_id,mutation_id,revision)
    values(owner_id,p_mutation_id,current_revision+1);
  if p_archive_key is not null then
    insert into public.ciao_import_backups(user_id,source_key,payload)
      values(owner_id,p_archive_key,p_archive) on conflict(user_id,source_key) do nothing;
  end if;
  return jsonb_build_object('revision',current_revision+1);
end;
$$;
revoke all on function public.ciao_commit_workspace(uuid,jsonb,bigint,uuid,text,jsonb) from public,anon;
grant execute on function public.ciao_commit_workspace(uuid,jsonb,bigint,uuid,text,jsonb) to authenticated;

-- Existing platform event-trigger helper is not a public API. Keep the trigger,
-- but remove its unnecessary API execution grants detected by the security advisor.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

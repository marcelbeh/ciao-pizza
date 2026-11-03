begin;
select set_config('ciao.qa_a',gen_random_uuid()::text,true),set_config('ciao.qa_b',gen_random_uuid()::text,true),set_config('ciao.qa_mutation',gen_random_uuid()::text,true);
insert into auth.users(id,email,aud,role) values
(current_setting('ciao.qa_a')::uuid,'qa-a-'||current_setting('ciao.qa_a')||'@example.invalid','authenticated','authenticated'),
(current_setting('ciao.qa_b')::uuid,'qa-b-'||current_setting('ciao.qa_b')||'@example.invalid','authenticated','authenticated');
insert into public.ciao_workspaces(user_id,document) values(current_setting('ciao.qa_b')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb);
insert into public.ciao_import_backups(user_id,source_key,payload) values(current_setting('ciao.qa_b')::uuid,'qa-other','{}'::jsonb);
insert into public.ciao_sync_receipts(user_id,mutation_id,revision) values(current_setting('ciao.qa_b')::uuid,gen_random_uuid(),1);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ciao.qa_a'),'role','authenticated','is_anonymous',false)::text,true);
do $$
declare r jsonb; denied boolean; n bigint;
begin
r:=public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,0,current_setting('ciao.qa_mutation')::uuid,'qa-import','{"raw":"original preserved"}'::jsonb);
assert (r->>'revision')::int=1,'own commit';
r:=public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,0,current_setting('ciao.qa_mutation')::uuid,'qa-import','{"raw":"original preserved"}'::jsonb);
assert (r->>'revision')::int=1,'idempotency';
denied:=false;begin
perform public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,0,gen_random_uuid());
exception when serialization_failure then denied:=true;end;
assert denied,'stale revision blocked';
denied:=false;begin
perform public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,1,gen_random_uuid(),repeat('x',151),'{}'::jsonb);
exception when check_violation then denied:=true;end;
assert denied,'archive failure rolls back entire commit';
select revision into n from public.ciao_workspaces where user_id=current_setting('ciao.qa_a')::uuid;assert n=1,'no partial write';
select count(*) into n from public.ciao_import_backups;assert n=1,'other backup hidden';
select count(*) into n from public.ciao_sync_receipts;assert n=1,'other receipt hidden';
select count(*) into n from public.ciao_workspaces where user_id=current_setting('ciao.qa_b')::uuid;assert n=0,'other account unreadable';
update public.ciao_workspaces set revision=999 where user_id=current_setting('ciao.qa_b')::uuid;
get diagnostics n=row_count;assert n=0,'other account not updated';
denied:=false;begin
perform public.ciao_commit_workspace(current_setting('ciao.qa_b')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,0,gen_random_uuid());
exception when insufficient_privilege then denied:=true;end;
assert denied,'account substitution blocked';
denied:=false;begin
update public.ciao_workspaces set user_id=current_setting('ciao.qa_b')::uuid where user_id=current_setting('ciao.qa_a')::uuid;
exception when insufficient_privilege then denied:=true;end;
assert denied,'ownership transfer blocked';
select count(*) into n from public.ciao_import_backups where user_id=current_setting('ciao.qa_a')::uuid and payload->>'raw'='original preserved';assert n=1,'atomic import archive';
select count(*) into n from public.ciao_sync_receipts where user_id=current_setting('ciao.qa_a')::uuid;assert n=1,'receipt not duplicated';
perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ciao.qa_a'),'role','authenticated','is_anonymous',true)::text,true);
select count(*) into n from public.ciao_workspaces;assert n=0,'anonymous auth user has no access';
denied:=false;begin
perform public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,1,gen_random_uuid());
exception when insufficient_privilege then denied:=true;end;
assert denied,'anonymous auth commit blocked';
end $$;
set local role anon;
do $$ declare denied boolean:=false;begin
begin perform count(*) from public.ciao_workspaces;exception when insufficient_privilege then denied:=true;end;
assert denied,'unauthenticated table access blocked';
denied:=false;begin
perform public.ciao_commit_workspace(current_setting('ciao.qa_a')::uuid,'{"version":1,"dough":{"version":1,"active":null,"profiles":[]},"recipes":[],"settings":{},"imports":[]}'::jsonb,0,gen_random_uuid());
exception when insufficient_privilege then denied:=true;end;
assert denied,'unauthenticated rpc blocked';
end $$;
reset role;
select jsonb_build_object('rls_own_and_other_account','passed','ownership_transfer','blocked','anonymous_access','blocked','cas_conflict','passed','idempotency','passed','atomic_import_archive','passed','test_data','rolled back') as verification;
rollback;
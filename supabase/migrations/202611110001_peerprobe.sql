-- PeerProbe MVP: versioned JSON aggregates with private row-level ACLs.
-- All writes pass through the authenticated Next.js domain layer and a service-only
-- compare-and-swap transaction. Browser roles have read access only, constrained by RLS.
begin;
create table public.peerprobe_revision (id boolean primary key default true check(id), revision bigint not null default 0);
insert into public.peerprobe_revision(id) values(true);
create table public.peerprobe_records (
 id text primary key,
 kind text not null check(kind in ('projects','builds','tasks','sessions','issues','attempts','comments','uploads')),
 owner_id uuid not null,
 tester_id uuid,
 data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id)
);
create index peerprobe_records_kind on public.peerprobe_records(kind);
create index peerprobe_records_owner on public.peerprobe_records(owner_id);
create index peerprobe_records_tester on public.peerprobe_records(tester_id);
create unique index peerprobe_one_student_per_task on public.peerprobe_records ((data->>'taskId'),tester_id) where kind='sessions';
create table public.peerprobe_private_criteria (
 id text primary key,
 task_id text not null unique references public.peerprobe_records(id) deferrable initially deferred,
 owner_id uuid not null,
 data jsonb not null check(data->>'id'=id and data->>'taskId'=task_id and data->>'ownerId'=owner_id::text)
);
alter table public.peerprobe_revision enable row level security;
alter table public.peerprobe_records enable row level security;
alter table public.peerprobe_private_criteria enable row level security;
create policy public_briefs on public.peerprobe_records for select to anon,authenticated
 using(kind in ('projects','builds','tasks'));
create policy private_work on public.peerprobe_records for select to authenticated
 using(owner_id=auth.uid() or tester_id=auth.uid());
create policy owner_only_criteria on public.peerprobe_private_criteria for select to authenticated
 using(owner_id=auth.uid());
revoke all on public.peerprobe_revision, public.peerprobe_records, public.peerprobe_private_criteria from anon,authenticated;
grant select on public.peerprobe_records, public.peerprobe_private_criteria to anon,authenticated;
grant all on public.peerprobe_revision, public.peerprobe_records, public.peerprobe_private_criteria to service_role;

create function public.peerprobe_snapshot() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('revision',revision,
 'projects',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='projects'),'[]'::jsonb),
 'builds',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='builds'),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='tasks'),'[]'::jsonb),
 'criteria',coalesce((select jsonb_agg(data order by id) from peerprobe_private_criteria),'[]'::jsonb),
 'sessions',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='sessions'),'[]'::jsonb),
 'issues',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='issues'),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='attempts'),'[]'::jsonb),
 'comments',coalesce((select jsonb_agg(data order by data->>'createdAt',id) from peerprobe_records where kind='comments'),'[]'::jsonb),
 'uploads',coalesce((select jsonb_agg(data order by id) from peerprobe_records where kind='uploads'),'[]'::jsonb))
 from peerprobe_revision where id=true;
$$;
create function public.peerprobe_commit(expected_revision bigint,next_state jsonb) returns boolean
language plpgsql security definer set search_path=public as $$
declare current_revision bigint; k text; item jsonb; project jsonb; task jsonb; issue jsonb; owner_uuid uuid; tester_uuid uuid;
begin
 select revision into current_revision from peerprobe_revision where id=true for update;
 if current_revision<>expected_revision then return false; end if;
 -- Validate capacity in the same transaction as the unique session constraint.
 for task in select value from jsonb_array_elements(next_state->'tasks') loop
  if (task->>'capacity')::int < (select count(*) from jsonb_array_elements(next_state->'sessions') x where x->>'taskId'=task->>'id') then
   raise exception 'All tester spots have been claimed';
  end if;
  if task->>'mode'='usability' and jsonb_array_length(task->'steps')<>0 then raise exception 'Usability tasks cannot expose steps'; end if;
  if task ? 'criteria' or task ? 'successCriteria' then raise exception 'Keep criteria in owner-only storage'; end if;
 end loop;
 delete from peerprobe_private_criteria;
 delete from peerprobe_records;
 foreach k in array array['projects','builds','tasks','sessions','issues','attempts','comments','uploads'] loop
  for item in select value from jsonb_array_elements(next_state->k) loop
   project:=null; task:=null; issue:=null; tester_uuid:=null;
   if k='projects' then project:=item;
   elsif k in ('builds','tasks','issues') then
    select value into project from jsonb_array_elements(next_state->'projects') where value->>'id'=item->>'projectId';
    if k='issues' then tester_uuid:=(item->>'testerId')::uuid; end if;
   elsif k='sessions' then
    select value into task from jsonb_array_elements(next_state->'tasks') where value->>'id'=item->>'taskId';
    select value into project from jsonb_array_elements(next_state->'projects') where value->>'id'=task->>'projectId';
    tester_uuid:=(item->>'testerId')::uuid;
    if item->>'buildId'<>task->>'buildId' then raise exception 'Session must reference its exact task build'; end if;
   else
    select value into issue from jsonb_array_elements(next_state->'issues') where value->>'id'=item->>'issueId';
    select value into project from jsonb_array_elements(next_state->'projects') where value->>'id'=issue->>'projectId';
    tester_uuid:=(issue->>'testerId')::uuid;
   end if;
   owner_uuid:=(project->>'ownerId')::uuid;
   if owner_uuid is null then raise exception 'Missing owning project'; end if;
   insert into peerprobe_records(id,kind,owner_id,tester_id,data) values(item->>'id',k,owner_uuid,tester_uuid,item);
  end loop;
 end loop;
 for item in select value from jsonb_array_elements(next_state->'criteria') loop
  insert into peerprobe_private_criteria(id,task_id,owner_id,data) values(item->>'id',item->>'taskId',(item->>'ownerId')::uuid,item);
 end loop;
 update peerprobe_revision set revision=revision+1 where id=true;
 return true;
end;
$$;
revoke all on function public.peerprobe_snapshot() from public,anon,authenticated;
revoke all on function public.peerprobe_commit(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.peerprobe_snapshot(),public.peerprobe_commit(bigint,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('screenshots','screenshots',false,5242880,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
create policy private_issue_screenshots on storage.objects for select to authenticated using (
 bucket_id='screenshots' and exists (
 select 1 from public.peerprobe_records r where r.kind='issues'
 and r.id=(storage.foldername(name))[1]
 and (r.owner_id=auth.uid() or r.tester_id=auth.uid())
 ));
-- No client upload/delete policy. The server validates issue ownership and image signatures.
commit;

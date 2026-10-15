#!/usr/bin/env bash
# Titan Club DB tests against a throwaway LOCAL Postgres (never the project database).
# Usage: bash scripts/titan-club-db.test.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/titan-club.sql"
if [ "$(id -u)" = 0 ]; then cp "$SRC" /tmp/tc-mig.sql; cp "$0" /tmp/tc-test.sh; chmod 644 /tmp/tc-mig.sql /tmp/tc-test.sh; exec setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/tmp TC_MIG=/tmp/tc-mig.sql bash /tmp/tc-test.sh; fi
MIG="${TC_MIG:-$SRC}"
DIR=$(mktemp -d); PORT=55433
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
A=aaaaaaaa-0000-0000-0000-000000000001; M=bbbbbbbb-0000-0000-0000-000000000002; N=cccccccc-0000-0000-0000-000000000003
cat > "$DIR/stub.sql" <<E
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \$\$ SELECT nullif(current_setting('test.uid', true),'')::uuid \$\$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) \$\$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
INSERT INTO public.profiles VALUES ('$A'),('$M'),('$N'),('eeeeeeee-0000-0000-0000-000000000005');
INSERT INTO public.user_roles VALUES ('$A','admin');
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
E
$P -f "$DIR/stub.sql"; $P -f "$MIG"
q() { $P -tA -c "$1"; }
as() { $P -tA -c "SET ROLE $1; SELECT set_config('test.uid','$2',false); $3" | tail -n1; }
try() { if $P -tA -c "SET ROLE authenticated; SELECT set_config('test.uid','$1',false); $2" >/dev/null 2>&1; then echo ok; else echo err; fi; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }

check "off by default" "$(q 'select enabled from titan_club_settings')" f
check "no members by default" "$(q 'select count(*) from titan_club_members')" 0
check "non-admin cannot assign" "$(try $M "select admin_set_titan_club('$M','percent',5,null,20,true,'')")" err
check "anon cannot call" "$(if $P -tA -c "SET ROLE anon; select admin_set_titan_club('$M','percent',5,null,20,true,'')" >/dev/null 2>&1; then echo ok; else echo err; fi)" err
check "direct insert blocked" "$(try $A "insert into titan_club_members(user_id,benefit_type,percent) values ('$M','percent',5)")" err
check "percent >100 rejected" "$(try $A "select admin_set_titan_club('$M','percent',100.5,null,20,true,'')")" err
check "max cap >100 rejected" "$(try $A "select admin_set_titan_club('$M','percent',5,null,100.01,true,'')")" err
check "max cap 0 rejected" "$(try $A "select admin_set_titan_club('$M','percent',5,null,0,true,'')")" err
check "max cap 3dp rejected" "$(try $A "select admin_set_titan_club('$M','percent',5,null,25.555,true,'')")" err
check "percent 3dp rejected" "$(try $A "select admin_set_titan_club('$M','percent',5.555,null,20,true,'')")" err
check "zero fixed rejected" "$(try $A "select admin_set_titan_club('$M','fixed',null,0,20,true,'')")" err
check "unknown member rejected" "$(try $A "select admin_set_titan_club(gen_random_uuid(),'percent',5,null,20,true,'')")" err
check "revoke non-member rejected" "$(try $A "select admin_set_titan_club('$N','percent',5,null,20,false,'')")" err

check "assign" "$(as authenticated $A "select admin_set_titan_club('$M','percent',7.5,999,20,true,'VIP')->>'action'")" assign
check "fixed field ignored for percent" "$(q "select coalesce(fixed_cents::text,'null') from titan_club_members")" null
check "idempotent re-assign" "$(as authenticated $A "select admin_set_titan_club('$M','percent',7.5,null,20,true,'VIP')->>'changed'")" false
check "edit to fixed" "$(as authenticated $A "select admin_set_titan_club('$M','fixed',null,1000,20,true,'VIP')->>'action'")" edit
check "cap override edit" "$(as authenticated $A "select admin_set_titan_club('$M','fixed',null,1000,30,true,'VIP')->>'action'")" edit
check "cap persisted" "$(q "select max_cap_percent from titan_club_members where user_id='$M'")" 30.00
check "100 percent benefit + 100 cap ok" "$(try $A "select admin_set_titan_club('eeeeeeee-0000-0000-0000-000000000005','percent',100,null,100,true,'')")" ok
check "note only" "$(as authenticated $A "select admin_set_titan_club('$M','fixed',null,1000,30,true,'VIP2')->>'action'")" note

check "member reads own row" "$(as authenticated $M "select count(*) from titan_club_members")" 1
check "other member sees none" "$(as authenticated $N "select count(*) from titan_club_members")" 0
check "member cannot read note" "$(as authenticated $M "select count(*) from titan_club_notes")" 0
check "member cannot read audit" "$(as authenticated $M "select count(*) from titan_club_events")" 0
check "member cannot read settings" "$(as authenticated $M "select count(*) from titan_club_settings")" 0
check "anon reads nothing" "$(if $P -tA -c "SET ROLE anon; select count(*) from titan_club_members" >/dev/null 2>&1; then echo ok; else echo err; fi)" err
check "member cannot self-update" "$(try $M "update titan_club_members set fixed_cents=99999")" err
check "my benefit null while off" "$(as authenticated $M "select coalesce(titan_club_my_benefit()::text,'null')")" null
check "non-admin cannot enable" "$(try $M "select admin_set_titan_club_enabled(true)")" err
as authenticated $A "select admin_set_titan_club_enabled(true)" >/dev/null
check "my benefit when on" "$(as authenticated $M "select titan_club_my_benefit()->>'fixed_cents'")" 1000
check "my benefit shows cap" "$(as authenticated $M "select titan_club_my_benefit()->>'max_cap_percent'")" 30.00
check "my benefit excludes note" "$(as authenticated $M "select titan_club_my_benefit() ? 'note'")" f
check "revoke" "$(as authenticated $A "select admin_set_titan_club('$M','fixed',null,1000,30,false,'VIP2')->>'action'")" revoke
check "revoked_at set" "$(q "select revoked_at is not null from titan_club_members where user_id='$M'")" t
check "my benefit null after revoke" "$(as authenticated $M "select coalesce(titan_club_my_benefit()::text,'null')")" null
check "reactivate" "$(as authenticated $A "select admin_set_titan_club('$M','fixed',null,1000,30,true,'VIP2')->>'action'")" reactivate
check "revoked_at cleared" "$(q "select revoked_at is null from titan_club_members where user_id='$M'")" t
check "audit trail" "$(q "select string_agg(action, ',' order by created_at, id) from (select action, created_at, id from titan_club_events where user_id='$M') e")" "assign,edit,edit,note,revoke,reactivate"
check "audit actor" "$(q "select count(*) from titan_club_events where actor='$A'")" 8

# Concurrent identical assigns: exactly one row and one assign event.
q "insert into profiles values ('dddddddd-0000-0000-0000-000000000004')"
for i in 1 2 3 4 5 6; do as authenticated $A "select admin_set_titan_club('dddddddd-0000-0000-0000-000000000004','percent',5,null,20,true,'')" >/dev/null & done; wait
check "concurrent assign: one row" "$(q "select count(*) from titan_club_members where user_id='dddddddd-0000-0000-0000-000000000004'")" 1
check "concurrent assign: one event" "$(q "select count(*) from titan_club_events where user_id='dddddddd-0000-0000-0000-000000000004'")" 1
exit $fail

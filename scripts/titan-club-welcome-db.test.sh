#!/usr/bin/env bash
# Throwaway LOCAL Postgres test of scripts/titan-club-welcome-email.sql (never the project database).
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
if [ "$(id -u)" = 0 ]; then for f in titan-club titan-club-stacking titan-club-free-shipping titan-club-welcome-email; do cp "$D/$f.sql" /tmp/tcw-$f.sql; done; cp "$0" /tmp/tcw-test.sh; chmod 644 /tmp/tcw-*; exec setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/tmp TCW_DIR=/tmp bash /tmp/tcw-test.sh; fi
pick() { if [ -n "${TCW_DIR:-}" ]; then echo "$TCW_DIR/tcw-$1.sql"; else echo "$D/$1.sql"; fi; }
DIR=$(mktemp -d); PORT=55437
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
A=aaaaaaaa-0000-0000-0000-000000000001; E=bbbbbbbb-0000-0000-0000-000000000002; N=cccccccc-0000-0000-0000-000000000003
R=dddddddd-0000-0000-0000-000000000004; C=eeeeeeee-0000-0000-0000-000000000005
cat > "$DIR/stub.sql" <<X
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \$\$ SELECT nullif(current_setting('test.uid', true),'')::uuid \$\$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) \$\$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.referral_settings (id smallint PRIMARY KEY, combined_cap_percent numeric);
INSERT INTO public.referral_settings VALUES (1, 20);
INSERT INTO public.profiles VALUES ('$A'),('$E'),('$N'),('$R'),('$C');
INSERT INTO public.user_roles VALUES ('$A','admin');
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
X
$P -f "$DIR/stub.sql"; $P -f "$(pick titan-club)"; $P -f "$(pick titan-club-stacking)"; $P -f "$(pick titan-club-free-shipping)"
q() { $P -tA -c "$1"; }
as() { $P -tA -c "SET ROLE $1; SELECT set_config('test.uid','$2',false); $3" | tail -n1; }
try() { if $P -tA -c "SET ROLE ${3:-authenticated}; SELECT set_config('test.uid','$1',false); $2" >/dev/null 2>&1; then echo ok; else echo err; fi; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
V3() { echo "select admin_set_titan_club_v3('$1','percent',${2:-10},null,30,${3:-true},'secret note',true,true,true,true,true,false,${4:-true})"; }
CNT() { q "select count(*) from titan_club_welcome_email_queue where user_id='$1'"; }

# Existing member BEFORE install: must never be emailed.
as authenticated $A "$(V3 $E)" >/dev/null
$P -f "$(pick titan-club-welcome-email)"
check "no backfill for existing member" "$(CNT $E)" 0
check "existing member edit: no queue" "$(as authenticated $A "$(V3 $E 15)" >/dev/null; CNT $E)" 0
check "existing revoke+reactivate: no queue" "$(as authenticated $A "$(V3 $E 15 false)" >/dev/null; as authenticated $A "$(V3 $E 15 true)" >/dev/null; CNT $E)" 0

check "v3 first assign queues one" "$(as authenticated $A "$(V3 $N 10 true true)" >/dev/null; CNT $N)" 1
check "snapshot is FINAL v3 state (foundation off, free shipping on)" "$(q "select concat_ws(',',snapshot->>'benefit_type',snapshot->>'percent',snapshot->>'max_cap_percent',snapshot->>'stack_foundation',snapshot->>'stack_code',snapshot->>'free_shipping') from titan_club_welcome_email_queue where user_id='$N'")" "percent,10.00,30.00,false,true,true"
check "snapshot excludes private note" "$(q "select count(*) from titan_club_welcome_email_queue where snapshot::text ilike '%note%' or snapshot::text ilike '%secret%'")" 0
check "edit: no duplicate" "$(as authenticated $A "$(V3 $N 12)" >/dev/null; CNT $N)" 1
check "noop: no duplicate" "$(as authenticated $A "$(V3 $N 12)" >/dev/null; CNT $N)" 1
check "revoke+reactivate: no duplicate" "$(as authenticated $A "$(V3 $N 12 false)" >/dev/null; as authenticated $A "$(V3 $N 12 true)" >/dev/null; CNT $N)" 1
check "snapshot unchanged by later edits" "$(q "select snapshot->>'percent' from titan_club_welcome_email_queue where user_id='$N'")" 10.00
check "fixed via v1 queues" "$(as authenticated $A "select admin_set_titan_club('$C','fixed',null,2500,30,true,'')" >/dev/null; q "select snapshot->>'fixed_cents' from titan_club_welcome_email_queue where user_id='$C'")" 2500

# Rollback: assignment that fails after insert leaves no queue row.
check "failed assignment rolls back queue" "$($P -tA -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('test.uid','$A',true); $(V3 $R); SELECT 1/0; COMMIT;" >/dev/null 2>&1 || true; CNT $R)" 0
check "rejected assignment (bad cap) queues nothing" "$(try $A "select admin_set_titan_club_v3('$R','percent',10,null,5,true,'',true,true,true,true,true,false,true)" >/dev/null; CNT $R)" 0
check "assign+revoke in one tx: nothing queued" "$($P -tA -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('test.uid','$A',true); $(V3 $R); $(V3 $R 10 false); COMMIT;" >/dev/null; CNT $R)" 0

# Concurrency: two parallel first assignments of the same member.
F=ffffffff-0000-0000-0000-000000000006; q "insert into profiles values ('$F')"
( as authenticated $A "$(V3 $F 10)" >/dev/null 2>&1 || true ) & ( as authenticated $A "$(V3 $F 11)" >/dev/null 2>&1 || true ) & wait
check "concurrent first assign: exactly one queued" "$(CNT $F)" 1

# Access control.
check "member cannot read queue" "$(as authenticated $N "select count(*) from titan_club_welcome_email_queue")" 0
check "admin can read queue" "$(as authenticated $A "select count(*)>0 from titan_club_welcome_email_queue")" t
check "anon cannot read queue" "$(try '' "select * from titan_club_welcome_email_queue" anon)" err
check "admin cannot insert queue" "$(try $A "insert into titan_club_welcome_email_queue(user_id,snapshot) values ('$R','{}')")" err
check "admin cannot update queue" "$(try $A "update titan_club_welcome_email_queue set completed_at=now()")" err
check "authenticated cannot claim" "$(try $A "select claim_titan_club_welcome_emails(5)")" err
check "anon cannot claim" "$(try '' "select claim_titan_club_welcome_emails(5)" anon)" err
check "trigger fn not callable" "$(try $A "select queue_titan_club_welcome_email()")" err

# Worker claim.
check "programme off: nothing claimed" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10)")" 0
q "update titan_club_settings set enabled=true where id=1"
check "service claims pending" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10)")" 3
check "claimed rows not re-claimed" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10)")" 0
check "attempts incremented" "$(q "select attempts from titan_club_welcome_email_queue where user_id='$N'")" 1
q "update titan_club_welcome_email_queue set claimed_until=null, next_attempt_at=now() + interval '1 hour', last_error='x' where user_id='$N'"
check "retry later not claimed early" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10) where user_id='$N'")" 0
q "update titan_club_welcome_email_queue set completed_at=now(), outcome='recipient_suppressed', claimed_until=null, next_attempt_at=now() where user_id='$C'"
check "completed (suppressed) is terminal" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10) where user_id='$C'")" 0
q "update titan_club_welcome_email_queue set next_attempt_at=now() where user_id='$N'"
check "retry due is claimed" "$(as service_role '' "select count(*) from claim_titan_club_welcome_emails(10) where user_id='$N'")" 1
exit $fail

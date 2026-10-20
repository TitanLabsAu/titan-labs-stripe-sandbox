#!/usr/bin/env bash
# Foundation 25-place limit tests against a throwaway LOCAL Postgres (never the project database).
# Usage: bash scripts/foundation-capacity-db.test.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [ "$(id -u)" = 0 ]; then
  cat "$ROOT/scripts/foundation-member.sql" "$ROOT/drizzle/migrations/0041_foundation_admin_grant.sql" > /tmp/fc-base.sql
  cp "$ROOT/scripts/foundation-capacity-25.sql" /tmp/fc-new.sql; chmod 644 /tmp/fc-*.sql
  exec setpriv --reuid=7777 --regid=7777 --clear-groups env HOME=/tmp FC_INNER=1 bash "$0"
fi
DIR=$(mktemp -d); PORT=55433
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
$P <<'E'
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false, refunded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
E
$P -f /tmp/fc-base.sql
q() { $P -tA -c "$1"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
paid() { q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (${1:-gen_random_uuid()},true,'processing')"; }

# Live-like state before migration: launched, open, 8 existing awards (one manual grant).
q "UPDATE foundation_member_settings SET enrolment_enabled=true"
L1=$(q "select launched_at from foundation_member_settings")
for i in $(seq 1 7); do paid; done
ADM=aaaaaaaa-0000-0000-0000-000000000001; M=bbbbbbbb-0000-0000-0000-000000000001
q "INSERT INTO user_roles VALUES ('$ADM','admin'); INSERT INTO profiles VALUES ('$M')"
$P -tA -c "SET test.uid='$ADM'; select admin_set_foundation_member('$M', true)" >/dev/null
BEFORE=$(q "select string_agg(user_id||':'||member_number||':'||coalesce(order_id::text,'grant'),',' order by member_number) from foundation_members")

$P -f /tmp/fc-new.sql
check "capacity is 25" "$(q 'select capacity from foundation_member_settings')" 25
check "capacity default 25" "$(q "select column_default from information_schema.columns where table_name='foundation_member_settings' and column_name='capacity'")" 25
check "launch cutoff preserved" "$(q 'select launched_at from foundation_member_settings')" "$L1"
check "enrolment preserved" "$(q 'select enrolment_enabled from foundation_member_settings')" t
check "5% preserved" "$(q 'select benefit_percent::int from foundation_member_settings')" 5
check "existing awards unchanged" "$(q "select string_agg(user_id||':'||member_number||':'||coalesce(order_id::text,'grant'),',' order by member_number) from foundation_members")" "$BEFORE"
q "UPDATE foundation_member_settings SET capacity=50" >/dev/null
check "capacity cannot be raised back" "$(q 'select capacity from foundation_member_settings')" 25
check "public status reports 25" "$($P -tA -c "SET ROLE anon; select foundation_programme_status()->>'capacity'")" 25

# Duplicate buyer: an existing member's new paid order earns nothing new
U=$(q "select user_id from foundation_members where member_number=1"); paid "'$U'"
check "duplicate buyer no second award" "$(q "select count(*) from foundation_members where user_id='$U'")" 1
for i in $(seq 9 23); do paid; done
check "at 23" "$(q 'select count(*) from foundation_members')" 23
paid; check "24th awarded" "$(q 'select max(member_number) from foundation_members')" 24
paid; check "25th awarded" "$(q 'select count(*)||chr(58)||max(member_number) from foundation_members')" "25:25"
paid; check "26th not awarded" "$(q 'select count(*) from foundation_members')" 25
M2=bbbbbbbb-0000-0000-0000-000000000002; q "INSERT INTO profiles VALUES ('$M2')"
r=$($P -tA -c "SET test.uid='$ADM'; select admin_set_foundation_member('$M2', true)" 2>&1 || true)
case "$r" in *"places are taken"*) check "manual grant blocked at 25" ok ok;; *) check "manual grant blocked at 25" "$r" taken;; esac
# Free one place, then race 6 paid orders + 1 manual grant for it
$P -tA -c "SET test.uid='$ADM'; select admin_set_foundation_member('$M', false)" >/dev/null
for i in $(seq 1 6); do $P -c "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'processing')" >/dev/null & done
$P -tA -c "SET test.uid='$ADM'; select admin_set_foundation_member('$M2', true)" >/dev/null 2>&1 &
wait
check "concurrent: still exactly 25 distinct" "$(q 'select count(*)||chr(58)||count(distinct member_number)||chr(58)||max(member_number) from foundation_members')" "25:25:25"
# Over-capacity history is preserved (simulated >25 pre-existing awards)
q "ALTER TABLE foundation_members DISABLE TRIGGER foundation_members_immutable; INSERT INTO foundation_members(user_id,member_number,order_id) SELECT gen_random_uuid(), 26+g, NULL FROM generate_series(0,2) g; ALTER TABLE foundation_members ENABLE TRIGGER foundation_members_immutable"
paid; check ">25 legacy kept, no new award" "$(q 'select count(*) from foundation_members')" 28
exit $fail

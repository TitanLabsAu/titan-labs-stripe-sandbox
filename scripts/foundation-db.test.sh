#!/usr/bin/env bash
# Foundation Member allocation tests against a throwaway LOCAL Postgres (never the project database).
# Usage: bash scripts/foundation-db.test.sh <path-to-migration.sql>
set -euo pipefail
if [ "$(id -u)" = 0 ]; then cp "$1" /tmp/fm-mig.sql; chmod 644 /tmp/fm-mig.sql; exec setpriv --reuid=7777 --regid=7777 --clear-groups env HOME=/tmp bash "$0" /tmp/fm-mig.sql; fi
MIG="${1:?migration sql path}"
DIR=$(mktemp -d); PORT=55432
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
cat > "$DIR/stub.sql" <<'E'
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false, refunded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
E
$P -f "$DIR/stub.sql"; $P -f "$MIG"
q() { $P -tA -c "$1"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }

# Disabled / prelaunch
q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'processing')"
check "disabled: no award" "$(q 'select count(*) from foundation_members')" 0
q "INSERT INTO orders(id,user_id,created_at) VALUES ('00000000-0000-0000-0000-0000000000aa',gen_random_uuid(),now()-interval '1 day')"
q "UPDATE foundation_member_settings SET enrolment_enabled=true"
L1=$(q "select launched_at from foundation_member_settings")
q "UPDATE orders SET payment_confirmed=true,status='processing' WHERE id='00000000-0000-0000-0000-0000000000aa'"
check "prelaunch order paid after launch: no award" "$(q 'select count(*) from foundation_members')" 0
# Off/on keeps cutoff
q "UPDATE foundation_member_settings SET enrolment_enabled=false"; q "UPDATE foundation_member_settings SET enrolment_enabled=true, launched_at=now()+interval '1 year', capacity=99"
check "cutoff fixed after off/on" "$(q 'select launched_at from foundation_member_settings')" "$L1"
check "capacity immutable" "$(q 'select capacity from foundation_member_settings')" 50
# Exclusions
q "INSERT INTO orders(user_id) VALUES (gen_random_uuid())"
q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (NULL,true,'processing')"
q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'cancelled')"
q "INSERT INTO orders(user_id,payment_confirmed,status,refunded_at) VALUES (gen_random_uuid(),true,'processing',now())"
check "unpaid/guest/cancelled/refunded excluded" "$(q 'select count(*) from foundation_members')" 0
# Paid-at-insert and paid-on-update; repeat same user
U=11111111-1111-1111-1111-111111111111
q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES ('$U',true,'processing')"
q "INSERT INTO orders(id,user_id) VALUES ('00000000-0000-0000-0000-0000000000bb','$U')"
q "UPDATE orders SET payment_confirmed=true,status='processing' WHERE id='00000000-0000-0000-0000-0000000000bb'"
q "UPDATE orders SET status='shipped' WHERE id='00000000-0000-0000-0000-0000000000bb'"
check "one award per user, #1" "$(q "select count(*)||':'||max(member_number) from foundation_members where user_id='$U'")" "1:1"
# Fill to 49, then 50, then concurrent 51st+
for i in $(seq 2 48); do q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'processing')"; done
check "at 48" "$(q 'select count(*) from foundation_members')" 48
q "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'processing')"
check "49th awarded" "$(q 'select max(member_number) from foundation_members')" 49
for i in $(seq 1 6); do $P -c "INSERT INTO orders(user_id,payment_confirmed,status) VALUES (gen_random_uuid(),true,'processing')" & done; wait
check "concurrent: exactly 50" "$(q 'select count(*)||chr(58)||count(distinct member_number)||chr(58)||max(member_number) from foundation_members')" "50:50:50"
# Pause keeps awards; awards immutable
q "UPDATE foundation_member_settings SET enrolment_enabled=false"
check "51st+ concurrent got nothing (6 tried)" "$(q "select count(*) from orders o where payment_confirmed and status<>'cancelled' and refunded_at is null and user_id is not null and not exists(select 1 from foundation_members f where f.order_id=o.id) and created_at>=(select launched_at from foundation_member_settings)")" 5
check "pause keeps awards" "$(q 'select count(*) from foundation_members')" 50
if q "DELETE FROM foundation_members" 2>/dev/null; then check "awards immutable" yes no; else check "awards immutable" yes yes; fi
# Ordinary user cannot self-grant or change settings
A=$(q "select gen_random_uuid()")
r=$($P -tA -c "SET ROLE authenticated; SET test.uid='$A'; INSERT INTO foundation_members(user_id,member_number,order_id) SELECT '$A',1,id FROM orders LIMIT 1" 2>&1 || true)
case "$r" in *denied*) check "user cannot self-grant" ok ok;; *) check "user cannot self-grant" "$r" denied;; esac
r=$($P -tA -c "SET ROLE authenticated; SET test.uid='$A'; UPDATE foundation_member_settings SET enrolment_enabled=true RETURNING 1")
check "user cannot change settings" "$r" ""
check "user sees no other awards" "$($P -tA -c "SET ROLE authenticated; SET test.uid='$A'; select count(*) from foundation_members")" 0
check "own award visible" "$($P -tA -c "SET ROLE authenticated; SET test.uid='$U'; select member_number from foundation_members")" 1
check "public aggregate" "$($P -tA -c "SET ROLE anon; select foundation_programme_status()->>'awarded'")" 50
exit $fail

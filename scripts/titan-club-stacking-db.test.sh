#!/usr/bin/env bash
# Throwaway LOCAL Postgres test of STAGED scripts/titan-club-stacking.sql (never the project database).
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
if [ "$(id -u)" = 0 ]; then cp "$D/titan-club.sql" /tmp/tcs-base.sql; cp "$D/titan-club-stacking.sql" /tmp/tcs-stack.sql; cp "$0" /tmp/tcs-test.sh; chmod 644 /tmp/tcs-*; exec setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/tmp TCS_DIR=/tmp bash /tmp/tcs-test.sh; fi
BASE="${TCS_DIR:+$TCS_DIR/tcs-base.sql}"; BASE="${BASE:-$D/titan-club.sql}"
STACK="${TCS_DIR:+$TCS_DIR/tcs-stack.sql}"; STACK="${STACK:-$D/titan-club-stacking.sql}"
DIR=$(mktemp -d); PORT=55434
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
A=aaaaaaaa-0000-0000-0000-000000000001; L=bbbbbbbb-0000-0000-0000-000000000002; N=cccccccc-0000-0000-0000-000000000003
cat > "$DIR/stub.sql" <<E
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \$\$ SELECT nullif(current_setting('test.uid', true),'')::uuid \$\$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) \$\$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.referral_settings (id smallint PRIMARY KEY, combined_cap_percent numeric);
INSERT INTO public.referral_settings VALUES (1, 20);
INSERT INTO public.profiles VALUES ('$A'),('$L'),('$N');
INSERT INTO public.user_roles VALUES ('$A','admin');
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
E
$P -f "$DIR/stub.sql"; $P -f "$BASE"
q() { $P -tA -c "$1"; }
as() { $P -tA -c "SET ROLE $1; SELECT set_config('test.uid','$2',false); $3" | tail -n1; }
try() { if $P -tA -c "SET ROLE ${3:-authenticated}; SELECT set_config('test.uid','$1',false); $2" >/dev/null 2>&1; then echo ok; else echo err; fi; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
POL() { q "select concat_ws(',',stack_multibuy,stack_crypto,stack_first_offer,stack_code,stack_credit,stack_foundation) from titan_club_members where user_id='$1'"; }
V2() { echo "select admin_set_titan_club_v2('$1','percent',10,null,30,true,'$2',$3)"; }

# Legacy member saved BEFORE the stacking update.
as authenticated $A "select admin_set_titan_club('$L','percent',10,null,30,true,'legacy note')" >/dev/null
$P -f "$STACK"; $P -f "$STACK"   # idempotent re-run
check "legacy row keeps all-on incl Foundation" "$(POL $L)" "t,t,t,t,t,t"
check "column default for new rows: Foundation off" "$(q "select column_default from information_schema.columns where table_name='titan_club_members' and column_name='stack_foundation'")" false

check "anon cannot call v2" "$(try '' "$(V2 $N '' 'true,true,true,true,true,false')" anon)" err
check "non-admin cannot call v2" "$(try $N "$(V2 $N '' 'true,true,true,true,true,false')")" err
check "null boolean rejected" "$(try $A "$(V2 $N '' 'true,true,null,true,true,false')")" err
check "non-boolean rejected" "$(try $A "$(V2 $N '' "true,'maybe',true,true,true,false")")" err
check "direct column update blocked" "$(try $A "update titan_club_members set stack_foundation=true")" err

check "new assign via v2" "$(as authenticated $A "$(V2 $N 'n1' 'true,false,true,false,true,false')" | python3 -c 'import json,sys;print(json.load(sys.stdin)["action"])')" assign
check "new policy saved" "$(POL $N)" "t,f,t,f,t,f"
check "new via v1 defaults Foundation off" "$(q "insert into profiles values ('dddddddd-0000-0000-0000-000000000004')"; as authenticated $A "select admin_set_titan_club('dddddddd-0000-0000-0000-000000000004','percent',5,null,20,true,'')" >/dev/null; POL dddddddd-0000-0000-0000-000000000004)" "t,t,t,t,t,f"
check "identical v2 = no-op" "$(as authenticated $A "$(V2 $N 'n1' 'true,false,true,false,true,false')->>'changed'")" false
check "toggle-only change" "$(as authenticated $A "$(V2 $N 'n1' 'true,false,true,false,true,true')->>'action'")" policy
check "toggle-only audit before/after" "$(q "select (before->>'foundation')||'>'||(after->>'foundation') from titan_club_events where user_id='$N' and action='policy' order by created_at desc limit 1")" "false>true"
check "benefit + policy change: both audited" "$(as authenticated $A "select admin_set_titan_club_v2('$N','percent',12,null,30,true,'n1',true,true,true,false,true,true)->>'action'")" edit
check "audit trail" "$(q "select string_agg(action, ',' order by created_at, id) from titan_club_events where user_id='$N'")" "assign,policy,policy,edit,policy"
check "legacy RPC edit does NOT reset policy" "$(as authenticated $A "select admin_set_titan_club('$N','percent',15,null,30,true,'n2')" >/dev/null; POL $N)" "t,t,t,f,t,t"
check "legacy RPC revoke keeps policy" "$(as authenticated $A "select admin_set_titan_club('$N','percent',15,null,30,false,'n2')" >/dev/null; POL $N)" "t,t,t,f,t,t"
check "reactivate via v2 keeps/sets policy" "$(as authenticated $A "select admin_set_titan_club_v2('$N','percent',15,null,30,true,'n2',true,true,true,false,true,true)->>'action'")" reactivate

as authenticated $A "select admin_set_titan_club_enabled(true)" >/dev/null
check "member own benefit includes policy" "$(as authenticated $N "select titan_club_my_benefit()->'stacking'->>'foundation'")" true
check "member own benefit excludes note" "$(as authenticated $N "select titan_club_my_benefit() ? 'note'")" f
check "member cannot read notes" "$(as authenticated $N "select count(*) from titan_club_notes")" 0
check "member cannot read audit" "$(as authenticated $N "select count(*) from titan_club_events")" 0
check "member sees only own row" "$(as authenticated $N "select count(*) from titan_club_members")" 1
check "member cannot self-edit policy" "$(try $N "update titan_club_members set stack_code=true")" err
check "admin reads notes" "$(as authenticated $A "select note from titan_club_notes where user_id='$N'")" n2
exit $fail

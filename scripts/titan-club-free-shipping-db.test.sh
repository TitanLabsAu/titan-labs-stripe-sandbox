#!/usr/bin/env bash
# Throwaway LOCAL Postgres test of scripts/titan-club-free-shipping.sql (never the project database).
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
if [ "$(id -u)" = 0 ]; then cp "$D/titan-club.sql" /tmp/tfs-base.sql; cp "$D/titan-club-stacking.sql" /tmp/tfs-stack.sql; cp "$D/titan-club-free-shipping.sql" /tmp/tfs-fs.sql; cp "$0" /tmp/tfs-test.sh; chmod 644 /tmp/tfs-*; exec setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/tmp TFS_DIR=/tmp bash /tmp/tfs-test.sh; fi
pick() { if [ -n "${TFS_DIR:-}" ]; then echo "$TFS_DIR/tfs-$1.sql"; else echo "$D/$2"; fi; }
BASE=$(pick base titan-club.sql); STACK=$(pick stack titan-club-stacking.sql); FS=$(pick fs titan-club-free-shipping.sql)
DIR=$(mktemp -d); PORT=55436
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
$P -f "$DIR/stub.sql"; $P -f "$BASE"; $P -f "$STACK"
q() { $P -tA -c "$1"; }
as() { $P -tA -c "SET ROLE $1; SELECT set_config('test.uid','$2',false); $3" | tail -n1; }
try() { if $P -tA -c "SET ROLE ${3:-authenticated}; SELECT set_config('test.uid','$1',false); $2" >/dev/null 2>&1; then echo ok; else echo err; fi; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
FSV() { q "select free_shipping from titan_club_members where user_id='$1'"; }
POL() { q "select concat_ws(',',stack_multibuy,stack_crypto,stack_first_offer,stack_code,stack_credit,stack_foundation,percent,active) from titan_club_members where user_id='$1'"; }
V3() { echo "select admin_set_titan_club_v3('$1','percent',10,null,30,true,'n',true,true,true,true,true,false,$2)"; }

as authenticated $A "select admin_set_titan_club_v2('$L','percent',10,null,30,true,'legacy',true,false,true,true,true,true)" >/dev/null
BEFORE=$(POL $L)
$P -f "$FS"; $P -f "$FS"
check "existing row defaults false" "$(FSV $L)" f
check "existing policy/benefit unchanged" "$(POL $L)" "$BEFORE"
check "anon cannot call v3" "$(try '' "$(V3 $N true)" anon)" err
check "non-admin cannot call v3" "$(try $N "$(V3 $N true)")" err
check "null flag rejected" "$(try $A "$(V3 $N null)")" err
check "non-boolean rejected" "$(try $A "$(V3 $N "'maybe'")")" err
check "direct update blocked" "$(try $A "update titan_club_members set free_shipping=true")" err
check "new assign v3 off" "$(as authenticated $A "$(V3 $N false)->>'action'")" assign
check "new row false" "$(FSV $N)" f
check "identical = noop" "$(as authenticated $A "$(V3 $N false)->>'changed'")" false
check "toggle-only audited as shipping" "$(as authenticated $A "$(V3 $N true)->>'action'")" shipping
check "audit before/after" "$(q "select (before->>'free_shipping')||'>'||(after->>'free_shipping') from titan_club_events where user_id='$N' and action='shipping'")" "false>true"
check "legacy v1 edit preserves flag" "$(as authenticated $A "select admin_set_titan_club('$N','percent',15,null,30,true,'n2')" >/dev/null; FSV $N)" t
check "v2 edit preserves flag" "$(as authenticated $A "select admin_set_titan_club_v2('$N','percent',15,null,30,true,'n2',true,true,true,false,true,false)" >/dev/null; FSV $N)" t
check "own benefit shows flag (programme on)" "$(q "update titan_club_settings set enabled=true where id=1"; as authenticated $N "select titan_club_my_benefit()->>'free_shipping'")" true
check "other member sees own (false)" "$(as authenticated $L "select titan_club_my_benefit()->>'free_shipping'")" false
check "revoked: no benefit" "$(as authenticated $A "select admin_set_titan_club('$N','percent',15,null,30,false,'n2')" >/dev/null; as authenticated $N "select coalesce(titan_club_my_benefit()::text,'null')")" null
check "paused: no benefit" "$(q "update titan_club_settings set enabled=false where id=1"; as authenticated $L "select coalesce(titan_club_my_benefit()::text,'null')")" null
check "anon cannot read own benefit" "$(try '' "select titan_club_my_benefit()" anon)" err
check "anon cannot read members" "$(try '' "select * from titan_club_members" anon)" err
exit $fail

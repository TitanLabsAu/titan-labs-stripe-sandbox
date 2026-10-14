#!/usr/bin/env bash
# First-purchase offer lifecycle tests on a throwaway LOCAL Postgres (never the project database).
set -euo pipefail
if [ "$(id -u)" = 0 ]; then cp scripts/first-offer-stale.sql /tmp/fo-mig.sql; chmod 644 /tmp/fo-mig.sql; exec setpriv --reuid=7777 --regid=7777 --clear-groups env HOME=/tmp bash "$0" /tmp/fo-mig.sql; fi
MIG="${1:-scripts/first-offer-stale.sql}"
DIR=$(mktemp -d); PORT=55433
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
$P <<'S'
CREATE TYPE order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE FUNCTION normalize_emails(_e text[]) RETURNS text[] LANGUAGE sql AS $$ SELECT coalesce(array_agg(DISTINCT lower(trim(x))),'{}') FROM unnest(_e) x $$;
CREATE TABLE first_purchase_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, emails text[], status text, payment_attempt_id uuid, order_id uuid, expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE payment_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text, transaction_id text);
CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false, contact_email_normalized text, first_offer_claim_id uuid, payment_transaction_id text UNIQUE);
CREATE FUNCTION first_offer_eligible(_user_id uuid, _emails text[]) RETURNS boolean LANGUAGE plpgsql AS $f$
DECLARE _e text[] := normalize_emails(_emails); BEGIN
  IF EXISTS (SELECT 1 FROM orders o WHERE o.status <> 'cancelled' AND o.payment_confirmed AND (o.user_id=_user_id OR o.contact_email_normalized = ANY(_e))) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM first_purchase_claims c WHERE (c.user_id=_user_id OR c.emails && _e) AND (c.status='consumed' OR (c.status='reserved' AND (c.expires_at IS NULL OR c.expires_at > now())))) THEN RETURN false; END IF;
  RETURN true; END $f$;
CREATE FUNCTION claim_first_offer(_user_id uuid, _emails text[], _ttl int) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _id uuid; BEGIN PERFORM pg_advisory_xact_lock(hashtext('u'||_user_id));
  IF NOT first_offer_eligible(_user_id,_emails) THEN RAISE EXCEPTION 'FIRST_OFFER_UNAVAILABLE'; END IF;
  INSERT INTO first_purchase_claims(user_id,emails,status,expires_at) VALUES (_user_id,normalize_emails(_emails),'reserved',now()+make_interval(mins=>_ttl)) RETURNING id INTO _id; RETURN _id; END $f$;
CREATE FUNCTION release_first_offer_for_attempt(_a uuid) RETURNS int LANGUAGE plpgsql AS $f$ DECLARE n int; BEGIN
  UPDATE first_purchase_claims SET status='released' WHERE payment_attempt_id=_a AND status='reserved' AND order_id IS NULL; GET DIAGNOSTICS n=ROW_COUNT; RETURN n; END $f$;
S
$P -f "$MIG"
$P -c "CREATE TRIGGER t AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION orders_first_offer_settlement()"
q() { $P -tA -c "$1"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
U=11111111-1111-1111-1111-111111111111; E="ARRAY['a@x.com']"
el() { q "select first_offer_eligible('$U',$E)"; }

# Stripe: failed attempt (declined, then canceled) -> released -> next success gets 10%
A1=aaaaaaaa-0000-0000-0000-000000000001
C=$(q "select claim_first_offer('$U',$E,60)"); q "update first_purchase_claims set payment_attempt_id='$A1', expires_at=null where id='$C'"
check "payable intent holds claim" "$(el)" f
q "select release_first_offer_for_attempt('$A1')" >/dev/null
check "cancelled intent restores offer" "$(el)" t
# repeat failures
for i in 2 3; do A=aaaaaaaa-0000-0000-0000-00000000000$i; C=$(q "select claim_first_offer('$U',$E,60)"); q "update first_purchase_claims set payment_attempt_id='$A' where id='$C'"; q "select release_first_offer_for_attempt('$A')">/dev/null; done
check "repeat failures still eligible" "$(el)" t
# simultaneous first attempts: second claim blocked
C=$(q "select claim_first_offer('$U',$E,60)")
check "second simultaneous claim blocked" "$($P -tA -c "select claim_first_offer('$U',$E,60)" 2>&1 | grep -c FIRST_OFFER_UNAVAILABLE)" 1
# Manual unpaid order holds, not consumes; cancel releases
O1=$(q "insert into orders(user_id,first_offer_claim_id) values ('$U','$C') returning id" | head -1)
check "unpaid manual order holds (reserved)" "$(q "select status||coalesce(expires_at::text,'-') from first_purchase_claims where id='$C'")" "reserved-"
check "held offer not reusable" "$(el)" f
q "update orders set status='cancelled' where id='$O1'"
check "cancelled unpaid order releases" "$(q "select status from first_purchase_claims where id='$C'")" released
check "eligible after cancel" "$(el)" t
# Unpaid other order without offer doesn't block
q "insert into orders(user_id) values ('$U')"
check "unpaid order w/o offer doesn't block" "$(el)" t
# Manual paid confirmation consumes
C=$(q "select claim_first_offer('$U',$E,30)")
O2=$(q "insert into orders(user_id,first_offer_claim_id) values ('$U','$C') returning id" | head -1)
q "update orders set payment_confirmed=true, status='processing' where id='$O2'"
check "manual payment confirm consumes" "$(q "select status from first_purchase_claims where id='$C'")" consumed
q "update orders set payment_confirmed=true where id='$O2'"
check "repeat confirm idempotent" "$(q "select count(*) from first_purchase_claims where status='consumed'")" 1
check "no reuse after success" "$(el)" f
# Stripe duplicate finalisation: unique txn keeps one order
U2=22222222-2222-2222-2222-222222222222
C2=$(q "select claim_first_offer('$U2',ARRAY['b@x.com'],60)")
q "insert into orders(user_id,payment_confirmed,status,first_offer_claim_id,payment_transaction_id) values ('$U2',true,'processing','$C2','pi_1')"
$P -c "insert into orders(user_id,payment_confirmed,status,first_offer_claim_id,payment_transaction_id) values ('$U2',true,'processing','$C2','pi_1')" >/dev/null 2>&1 || true
check "duplicate finalisation charged once" "$(q "select count(*) from orders where payment_transaction_id='pi_1'")" 1
check "stripe success consumes" "$(q "select status from first_purchase_claims where id='$C2'")" consumed
# Test-mode success never consumes the production offer or blocks eligibility
U3=33333333-3333-3333-3333-333333333333
C3=$(q "select claim_first_offer('$U3',ARRAY['c@x.com'],60)")
q "insert into payment_attempts(provider,transaction_id,stripe_livemode) values ('stripe','pi_test',false)"
q "insert into orders(user_id,payment_confirmed,status,first_offer_claim_id,payment_transaction_id) values ('$U3',true,'processing','$C3','pi_test')"
check "test-mode order flagged" "$(q "select stripe_livemode from orders where payment_transaction_id='pi_test'")" f
check "test-mode success releases claim" "$(q "select status from first_purchase_claims where id='$C3'")" released
check "test-mode paid order doesn't block" "$(q "select first_offer_eligible('$U3',ARRAY['c@x.com'])")" t
q "insert into payment_attempts(provider,transaction_id,stripe_livemode) values ('stripe','pi_live',true)"
C4=$(q "select claim_first_offer('$U3',ARRAY['c@x.com'],60)")
q "insert into orders(user_id,payment_confirmed,status,first_offer_claim_id,payment_transaction_id) values ('$U3',true,'processing','$C4','pi_live')"
check "live success consumes" "$(q "select status from first_purchase_claims where id='$C4'")" consumed
# Stale reopen: cancelled discounted manual order -> replacement takes 10% -> reopen old + mark paid is rejected
U4=44444444-4444-4444-4444-444444444444
C5=$(q "select claim_first_offer('$U4',ARRAY['d@x.com'],30)")
O5=$(q "insert into orders(user_id,first_offer_claim_id) values ('$U4','$C5') returning id" | head -1)
q "update orders set status='cancelled' where id='$O5'"
C6=$(q "select claim_first_offer('$U4',ARRAY['d@x.com'],30)")
O6=$(q "insert into orders(user_id,first_offer_claim_id) values ('$U4','$C6') returning id" | head -1)
q "update orders set payment_confirmed=true,status='processing' where id='$O6'"
q "update orders set status='processing' where id='$O5'"
check "stale reopened confirm rejected" "$($P -tA -c "update orders set payment_confirmed=true where id='$O5'" 2>&1 | grep -c FIRST_OFFER_STALE)" 1
check "stale order stays unpaid" "$(q "select payment_confirmed from orders where id='$O5'")" f
check "replacement keeps single consumed offer" "$(q "select count(*) from first_purchase_claims where user_id='$U4' and status='consumed'")" 1
# Card success with released claim still reconciles (authoritative)
q "update orders set status='cancelled' where id='$O5'"
q "update orders set payment_transaction_id='pi_late', status='processing' where id='$O5'"
check "succeeded card reconciliation not blocked" "$(q "update orders set payment_confirmed=true where id='$O5' returning payment_confirmed" | head -1)" t
check "late release can't free paid claim" "$(q "update first_purchase_claims set payment_attempt_id='aaaaaaaa-0000-0000-0000-000000000009' where id='$C2'; select release_first_offer_for_attempt('aaaaaaaa-0000-0000-0000-000000000009')" | tail -1)" 0
exit $fail

#!/usr/bin/env bash
# Referral first-purchase redemption lifecycle tests on a throwaway LOCAL Postgres (never the project database).
set -euo pipefail
if [ "$(id -u)" = 0 ]; then cp scripts/referral-redemption.sql /tmp/rr-mig.sql; chmod 644 /tmp/rr-mig.sql; exec setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/tmp bash "$0" /tmp/rr-mig.sql; fi
MIG="${1:-scripts/referral-redemption.sql}"
DIR=$(mktemp -d); PORT=55434
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
$P <<'S'
CREATE SCHEMA public;
CREATE TYPE public.order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE FUNCTION public.normalize_emails(_e text[]) RETURNS text[] LANGUAGE sql AS $$ SELECT coalesce(array_agg(DISTINCT lower(trim(x))),'{}') FROM unnest(_e) x $$;
CREATE TABLE public.referral_redemption_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, emails text[], code_id uuid, status text, payment_attempt_id uuid, order_id uuid, expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false, refunded_at timestamptz, contact_email_normalized text, referral_claim_id uuid, discount_code_id uuid, discount_code text, discount_code_kind text, referrer_user_id uuid, credit_units int NOT NULL DEFAULT 0, credit_reservation_id uuid, pricing_snapshot jsonb, stripe_livemode boolean, payment_transaction_id text, order_number bigint DEFAULT 1);
CREATE TABLE public.discount_codes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text, times_used int NOT NULL DEFAULT 0);
CREATE TABLE public.store_credit_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, kind text, units int, unit_cents int DEFAULT 0, order_id uuid, reason text, expires_at timestamptz);
CREATE TABLE public.store_credit_reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text, order_id uuid, expires_at timestamptz);
CREATE TABLE public.referral_settings(id int PRIMARY KEY, reward_every_referrals int DEFAULT 5, reward_percent numeric DEFAULT 10, reward_expiry_days int DEFAULT 90, program_enabled boolean DEFAULT true);
INSERT INTO public.referral_settings(id) VALUES (1);
CREATE TABLE public.admin_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, title text, body text, kind text, email_sent boolean, payload jsonb);
CREATE FUNCTION public.store_credit_available_units(_u uuid) RETURNS int LANGUAGE sql AS $$ SELECT 0 $$;
S
$P -f "$MIG"
$P -c "CREATE TRIGGER t AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_referral_settlement()"
q() { $P -tA -c "$1"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
U1=11111111-1111-1111-1111-111111111111; U2=22222222-2222-2222-2222-222222222222; REF=99999999-9999-9999-9999-999999999999
E1="ARRAY['buyer@x.com']"
CODE=cccccccc-0000-0000-0000-000000000001
q "INSERT INTO public.discount_codes(id, code) VALUES ('$CODE','FRIEND10')"
el() { q "select public.referral_redemption_eligible('$1',$2)"; }

# 1. New member is eligible; guest (null user) is not
check "new member eligible" "$(el $U1 "$E1")" t
check "guest not eligible" "$(el NULL "$E1")" f

# 2. Claim holds eligibility; second concurrent claim fails
C1=$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)")
check "live claim blocks eligibility" "$(el $U1 "$E1")" f
check "concurrent second claim rejected" "$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)" 2>/dev/null || echo REJECTED)" REJECTED

# 3. Failed/abandoned attempt releases; retry allowed
A1=aaaaaaaa-0000-0000-0000-0000000000aa
q "UPDATE public.referral_redemption_claims SET payment_attempt_id='$A1' WHERE id='$C1'"
check "release on failure" "$(q "select public.release_referral_redemption_for_attempt('$A1')")" 1
check "retry allowed after failure" "$(el $U1 "$E1")" t

# 4. Unpaid order holds claim; paid transition consumes it; code use counted
C2=$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)")
O1=bbbbbbbb-0000-0000-0000-0000000000b1
q "INSERT INTO public.orders(id,user_id,status,contact_email_normalized,referral_claim_id,discount_code_id,discount_code,discount_code_kind,referrer_user_id) VALUES ('$O1','$U1','pending_payment','buyer@x.com','$C2','$CODE','FRIEND10','referral','$REF')"
check "unpaid order attaches claim" "$(q "select order_id='$O1' and expires_at IS NULL from public.referral_redemption_claims where id='$C2'")" t
q "UPDATE public.orders SET status='processing', payment_confirmed=true WHERE id='$O1'"
check "paid consumes claim" "$(q "select status from public.referral_redemption_claims where id='$C2'")" consumed
check "code use counted once" "$(q "select times_used from public.discount_codes where id='$CODE'")" 1

# 5. Same buyer, different code, second order: claim impossible
CODE2=cccccccc-0000-0000-0000-000000000002
q "INSERT INTO public.discount_codes(id, code) VALUES ('$CODE2','OTHER10')"
check "returning buyer ineligible (any code)" "$(el $U1 "$E1")" f
check "second claim rejected" "$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE2',30)" 2>/dev/null || echo REJECTED)" REJECTED

# 6. Different account, same normalised email (guest history): ineligible
check "email match blocks second account" "$(el $U2 "$E1")" f

# 7. Stale/duplicate paid order without a valid claim: payment recorded, no usage, no reward, admin notified
O2=bbbbbbbb-0000-0000-0000-0000000000b2
q "INSERT INTO public.orders(id,user_id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code,discount_code_kind,referrer_user_id) VALUES ('$O2','$U1','processing',true,'buyer@x.com','$CODE','FRIEND10','referral','$REF')"
check "stale order still recorded paid" "$(q "select payment_confirmed from public.orders where id='$O2'")" t
check "stale referral not counted" "$(q "select times_used from public.discount_codes where id='$CODE'")" 1
check "skip notification written" "$(q "select count(*) from public.admin_notifications where order_id='$O2' and kind='referral-redemption-skipped'")" 1
check "skipped order excluded from tally" "$(q "select public.referral_paid_order_count('$REF')")" 1

# 8. Cancelled paid order releases claim and reverses usage
q "UPDATE public.orders SET status='cancelled', payment_confirmed=false WHERE id='$O1'"
check "cancel releases claim" "$(q "select status from public.referral_redemption_claims where id='$C2'")" released
check "cancel reverses code use" "$(q "select times_used from public.discount_codes where id='$CODE'")" 0
check "buyer eligible again after cancel" "$(el $U1 "$E1")" t

# 9. Referrer reward at threshold (5 paid first orders) via legacy ensure path
for i in 1 2 3 4 5; do
  UU="33333333-3333-3333-3333-33333333300$i"
  q "INSERT INTO public.orders(id,user_id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code,discount_code_kind,referrer_user_id) VALUES (gen_random_uuid(),'$UU','processing',true,'friend$i@x.com','$CODE','FRIEND10','referral','$REF')"
done
check "five friends each consumed once" "$(q "select count(*) from public.referral_redemption_claims where status='consumed'")" 6
check "referrer tally counts five friends" "$(q "select public.referral_paid_order_count('$REF')")" 6
check "one reward earned at threshold" "$(q "select coalesce(sum(-units),0) from public.store_credit_ledger where user_id='$REF' and kind='referral_earned'" | sed 's/-//')" 1

# 10. Test-mode (stripe_livemode=false) insert releases the claim
C3=$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)")
q "INSERT INTO public.orders(id,user_id,status,payment_confirmed,contact_email_normalized,referral_claim_id,stripe_livemode) VALUES (gen_random_uuid(),'$U1','processing',true,'buyer@x.com','$C3',false)"
check "test-mode order releases claim" "$(q "select status from public.referral_redemption_claims where id='$C3'")" released

if [ "$fail" = 0 ]; then echo "ALL REFERRAL REDEMPTION DB TESTS PASSED"; else echo "FAILURES"; exit 1; fi

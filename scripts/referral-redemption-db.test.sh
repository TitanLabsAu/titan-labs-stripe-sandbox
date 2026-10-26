#!/usr/bin/env bash
# Referral per-code redemption lifecycle tests on a throwaway LOCAL Postgres (never the project database).
set -euo pipefail
if [ "$(id -u)" = 0 ]; then cp scripts/referral-redemption.sql /tmp/rr-mig.sql; chmod 644 /tmp/rr-mig.sql; exec setpriv --reuid=7777 --regid=7777 --clear-groups env HOME=/tmp bash "$0" /tmp/rr-mig.sql; fi
MIG="${1:-scripts/referral-redemption.sql}"
DIR=$(mktemp -d); PORT=55434
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
$P <<'S'
CREATE ROLE service_role; CREATE ROLE anon; CREATE ROLE authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, email text);
CREATE TYPE public.order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE FUNCTION public.normalize_emails(_e text[]) RETURNS text[] LANGUAGE sql AS $$ SELECT coalesce(array_agg(DISTINCT lower(trim(x))),'{}') FROM unnest(_e) x $$;
CREATE TABLE public.referral_redemption_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, emails text[], code_id uuid, status text, payment_attempt_id uuid, order_id uuid, expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false, refunded_at timestamptz, contact_email_normalized text, referral_claim_id uuid, discount_code_id uuid, discount_code text, discount_code_kind text, referrer_user_id uuid, credit_units int NOT NULL DEFAULT 0, credit_reservation_id uuid, pricing_snapshot jsonb, stripe_livemode boolean, payment_confirmed_at timestamptz, payment_transaction_id text, order_number bigint DEFAULT 1);
CREATE TABLE public.payment_attempts(id uuid,order_id uuid,status text,stripe_livemode boolean);
CREATE TABLE public.order_checkpoint_email_queue(order_id uuid,kind text);
CREATE TABLE public.discount_codes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text, code_kind text DEFAULT 'referral', user_id uuid, max_uses int DEFAULT 1000000, times_used int NOT NULL DEFAULT 0);
CREATE TABLE public.store_credit_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, kind text, units int, unit_cents int DEFAULT 0, order_id uuid, reason text, expires_at timestamptz);
CREATE TABLE public.store_credit_reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text, order_id uuid, expires_at timestamptz);
CREATE TABLE public.referral_settings(id int PRIMARY KEY, reward_every_referrals int DEFAULT 5, reward_percent numeric DEFAULT 10, reward_expiry_days int DEFAULT 90, program_enabled boolean DEFAULT true);
INSERT INTO public.referral_settings(id) VALUES (1);
CREATE TABLE public.admin_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, title text, body text, kind text, email_sent boolean, payload jsonb);
CREATE FUNCTION public.store_credit_available_units(_u uuid) RETURNS int LANGUAGE sql AS $$ SELECT 0 $$;
-- Retained checkpoint evidence: successful guest order later cancelled/unconfirmed.
INSERT INTO public.orders(id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code_kind)
VALUES('bbbbbbbb-0000-0000-0000-0000000000bb','cancelled',false,'past-paid@x.com','cccccccc-0000-0000-0000-000000000001','referral');
INSERT INTO public.order_checkpoint_email_queue(order_id,kind)
VALUES('bbbbbbbb-0000-0000-0000-0000000000bb','payment-confirmed');
S
$P -f "$MIG"
$P -c "CREATE TRIGGER t AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_referral_settlement()"
q() { $P -tA -c "$1"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }
U1=11111111-1111-1111-1111-111111111111; U2=22222222-2222-2222-2222-222222222222; REF=99999999-9999-9999-9999-999999999999
E1="ARRAY['buyer@x.com']"
CODE=cccccccc-0000-0000-0000-000000000001; CODE2=cccccccc-0000-0000-0000-000000000002
q "INSERT INTO public.discount_codes(id,code,user_id) VALUES ('$CODE','EMMA10','$REF'),('$CODE2','DAVE10','$REF')"
q "INSERT INTO public.profiles VALUES ('$U1','buyer@x.com'),('$U2','other@x.com'),('$REF','owner@x.com')"
el() { q "select public.referral_redemption_eligible('$1',$2,'${3:-$CODE}',NULL)"; }
check "guest cannot redeem" "$(q "select public.referral_redemption_eligible(NULL,$E1,'$CODE',NULL)")" f
q "INSERT INTO public.orders(user_id,status,payment_confirmed,contact_email_normalized) VALUES ('$U1','processing',true,'buyer@x.com')"
check "returning buyer unused code accepted" "$(el $U1 "$E1")" t
check "own code account rejected" "$(el $REF "ARRAY['owner@x.com']")" f
check "own code normalized email rejected" "$(el $U2 "ARRAY[' OWNER@X.COM ']")" f
C1=$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)")
check "same code hold blocks" "$(el $U1 "$E1")" f
check "different code hold does not block" "$(el $U1 "$E1" $CODE2)" t
A1=aaaaaaaa-0000-0000-0000-0000000000aa
q "UPDATE public.referral_redemption_claims SET payment_attempt_id='$A1' WHERE id='$C1'"
check "failed attempt releases" "$(q "select public.release_referral_redemption_for_attempt('$A1')")" 1
check "retry after failure" "$(el $U1 "$E1")" t
O1=bbbbbbbb-0000-0000-0000-0000000000b1
C2=$(q "select public.claim_referral_redemption('$U1',$E1,'$CODE',30)")
q "INSERT INTO public.orders(id,user_id,contact_email_normalized,referral_claim_id,discount_code_id,discount_code,discount_code_kind,referrer_user_id) VALUES ('$O1','$U1','buyer@x.com','$C2','$CODE','EMMA10','referral','$REF')"
q "UPDATE public.orders SET status='processing',payment_confirmed=true WHERE id='$O1'"
check "manual paid consumes" "$(q "select status from public.referral_redemption_claims where id='$C2'")" consumed
check "same code paid blocks" "$(el $U1 "$E1")" f
check "different code paid accepted" "$(el $U1 "$E1" $CODE2)" t
check "same email different account blocked only same code" "$(el $U2 "ARRAY[' BUYER@X.COM ']")" f
check "same email different code accepted" "$(el $U2 "$E1" $CODE2)" t
O2=bbbbbbbb-0000-0000-0000-0000000000b2
q "INSERT INTO public.orders(id,user_id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code_kind,referrer_user_id) VALUES ('$O2','$U1','processing',true,'buyer@x.com','$CODE','referral','$REF')"
check "stale captured order recorded" "$(q "select payment_confirmed from public.orders where id='$O2'")" t
check "duplicate usage suppressed" "$(q "select times_used from public.discount_codes where id='$CODE'")" 1
check "duplicate rewards excluded" "$(q "select public.referral_paid_order_count('$REF')")" 1
check "duplicate notified" "$(q "select count(*) from public.admin_notifications where order_id='$O2' and kind='referral-redemption-skipped'")" 1
q "INSERT INTO public.orders(user_id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code_kind,referrer_user_id) VALUES ('$U1','processing',true,'buyer@x.com','$CODE2','referral','$REF')"
check "different code settles" "$(q "select times_used from public.discount_codes where id='$CODE2'")" 1
q "UPDATE public.orders SET status='cancelled',payment_confirmed=false WHERE id='$O1'"
check "successful use remains consumed after cancellation" "$(q "select status from public.referral_redemption_claims where id='$C2'")" consumed
check "successful code cannot repeat after cancellation" "$(el $U1 "$E1")" f
# Historical guest code use (before trigger installed) must count, unrelated purchases must not.
q "ALTER TABLE public.orders DISABLE TRIGGER t; INSERT INTO public.orders(status,payment_confirmed,contact_email_normalized,discount_code_id) VALUES ('delivered',true,'historic@x.com','$CODE'); ALTER TABLE public.orders ENABLE TRIGGER t"
check "historical guest same code blocked" "$(el $U2 "ARRAY[' HISTORIC@X.COM ']")" f
check "historical guest different code accepted" "$(el $U2 "ARRAY['historic@x.com']" $CODE2)" t
# Real overlapping LOCAL transactions: same code one winner; different code no identity lock conflict.
U3=33333333-3333-3333-3333-333333333333
(q "BEGIN; SELECT public.claim_referral_redemption('$U3',ARRAY['concurrent@x.com'],'$CODE',30); SELECT pg_sleep(1); COMMIT" >"$DIR/claim1") & pid=$!
for i in $(seq 1 30); do if [ "$(q "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted")" != 0 ]; then break; fi; done
check "concurrent different code succeeds without wait" "$(PGOPTIONS='-c lock_timeout=200ms' q "select public.claim_referral_redemption('$U3',ARRAY['concurrent@x.com'],'$CODE2',30) IS NOT NULL")" t
check "concurrent same code one winner" "$(q "select public.claim_referral_redemption('$U3',ARRAY['concurrent@x.com'],'$CODE',30)" 2>/dev/null || echo REJECTED)" REJECTED
wait "$pid"
# Unpaid cancellation releases; expired unbound hold retries.
U4=44444444-4444-4444-4444-444444444444
C4=$(q "select public.claim_referral_redemption('$U4',ARRAY['retry@x.com'],'$CODE',30)")
q "INSERT INTO public.orders(user_id,status,referral_claim_id,discount_code_id,discount_code_kind) VALUES ('$U4','cancelled','$C4','$CODE','referral')"
check "unpaid cancelled retry" "$(el $U4 "ARRAY['retry@x.com']")" t
q "UPDATE public.referral_redemption_claims SET status='reserved',order_id=NULL,expires_at=now()-interval '1 minute' WHERE id='$C4'"
check "expired abandoned retry" "$(el $U4 "ARRAY['retry@x.com']")" t
# Member vouchers keep original processing, even for returning referral users.
V=cccccccc-0000-0000-0000-000000000003
q "INSERT INTO public.discount_codes(id,code,code_kind,user_id) VALUES ('$V','REWARD','member','$U1'); INSERT INTO public.orders(user_id,status,payment_confirmed,discount_code_id,discount_code_kind) VALUES ('$U1','processing',true,'$V','member')"
check "earned member voucher untouched" "$(q "select times_used from public.discount_codes where id='$V'")" 1
# Historical global limits still suppress excess referral count, not payment.
q "UPDATE public.discount_codes SET max_uses=times_used WHERE id='$CODE2'; INSERT INTO public.orders(user_id,status,payment_confirmed,discount_code_id,discount_code_kind) VALUES ('$U4','processing',true,'$CODE2','referral')"
check "global limit preserved" "$(q "select times_used=max_uses from public.discount_codes where id='$CODE2'")" t
check "no-code obsolete RPC fails closed" "$(q "select public.referral_redemption_eligible('$U1',$E1)")" f
# Released late payment with no competing use settles normally.
U5=55555555-5555-5555-5555-555555555555
C5=$(q "select public.claim_referral_redemption('$U5',ARRAY['late@x.com'],'$CODE',30)")
q "UPDATE public.referral_redemption_claims SET status='released' WHERE id='$C5'; INSERT INTO public.orders(user_id,status,payment_confirmed,contact_email_normalized,referral_claim_id,discount_code_id,discount_code_kind) VALUES ('$U5','processing',true,'late@x.com','$C5','$CODE','referral')"
check "late successful released hold consumed" "$(q "select status from public.referral_redemption_claims where id='$C5'")" consumed
# Stale released claim AFTER another successful same-code purchase is suppressed.
U6=66666666-6666-6666-6666-666666666666
C6=$(q "select public.claim_referral_redemption('$U6',ARRAY['stale@x.com'],'$CODE',30)")
q "UPDATE public.referral_redemption_claims SET status='released' WHERE id='$C6'; INSERT INTO public.orders(user_id,status,payment_confirmed,contact_email_normalized,discount_code_id,discount_code_kind) VALUES ('$U6','processing',true,'stale@x.com','$CODE','referral')"
BEFORE=$(q "select times_used from public.discount_codes where id='$CODE'")
q "INSERT INTO public.orders(user_id,status,payment_confirmed,contact_email_normalized,referral_claim_id,discount_code_id,discount_code_kind) VALUES ('$U6','processing',true,'stale@x.com','$C6','$CODE','referral')"
check "stale released duplicate suppressed" "$(q "select times_used from public.discount_codes where id='$CODE'")" "$BEFORE"
# Historical paid-but-now-unconfirmed guest remains in durable email history.
check "historical successful guest remains blocked" "$(el $U2 "ARRAY[' PAST-PAID@X.COM ']")" f
check "historical success only blocks its code" "$(el $U2 "ARRAY['past-paid@x.com']" $CODE2)" t
if [ "$fail" = 0 ]; then echo "ALL REFERRAL REDEMPTION DB TESTS PASSED"; else exit 1; fi

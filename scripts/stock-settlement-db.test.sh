#!/usr/bin/env bash
# Paid-order stock settlement tests against a throwaway LOCAL Postgres (never the project database).
# Usage: bash scripts/stock-settlement-db.test.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/stock-settlement.sql"
if [ "$(id -u)" = 0 ]; then cp "$SRC" /tmp/ss-mig.sql; cp "$0" /tmp/ss-test.sh; chmod 644 /tmp/ss-mig.sql /tmp/ss-test.sh; exec setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/tmp SS_MIG=/tmp/ss-mig.sql bash /tmp/ss-test.sh; fi
MIG="${SS_MIG:-$SRC}"
DIR=$(mktemp -d); PORT=55434
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR" stop -m immediate >/dev/null; rm -rf "$DIR"' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
A=aaaaaaaa-0000-0000-0000-000000000001
cat > "$DIR/stub.sql" <<E
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \$\$ SELECT nullif(current_setting('test.uid', true),'')::uuid \$\$;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (user_id uuid, role app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) \$\$;
INSERT INTO public.user_roles VALUES ('$A','admin');
CREATE TYPE public.order_status AS ENUM ('processing','shipped','delivered','cancelled','pending_payment');
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0, product_variants jsonb NOT NULL DEFAULT '[]',
  unlimited_stock boolean NOT NULL DEFAULT false, catalogue_section text NOT NULL DEFAULT 'range');
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number bigint NOT NULL,
  status order_status NOT NULL DEFAULT 'pending_payment', payment_confirmed boolean NOT NULL DEFAULT false,
  refunded_at timestamptz);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  product_slug text NOT NULL, product_name text NOT NULL, variant_label text NOT NULL,
  unit_price numeric NOT NULL, quantity integer NOT NULL);
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL, product_slug text NOT NULL,
  variant_id text, variant_label text, kind text NOT NULL, before_qty integer NOT NULL,
  delta integer NOT NULL, after_qty integer NOT NULL, reason text NOT NULL, reference text,
  actor uuid, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_kind_check CHECK (kind = ANY (ARRAY['receive','remove','count','editor','system','sale'])));
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, title text NOT NULL,
  body text, kind text NOT NULL, read boolean NOT NULL DEFAULT false, email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
E
$P -f "$DIR/stub.sql"; $P -f "$MIG"
q() { $P -tA -c "$1"; }
settle() { $P -tA -c "SELECT set_config('titan.stock_settle','1',false); SELECT settle_order_stock('$1')" | tail -n1; }
retry() { $P -tA -c "SELECT set_config('test.uid','$A',false); SELECT retry_stock_settlement('$1')" | tail -n1; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got '$2' want '$3'"; fail=1; fi; }

# Fixtures: range product with variants, equipment multipack (stock in packs), unlimited equipment, no-variant product.
q "INSERT INTO products (slug,name,stock_quantity,product_variants) VALUES
  ('mt-1','MT-1',9,'[{\"id\":\"v10\",\"label\":\"10mg\",\"stock\":9}]'),
  ('pen','Pen',4,'[]')" >/dev/null
q "INSERT INTO products (slug,name,stock_quantity,product_variants,unlimited_stock,catalogue_section) VALUES
  ('sharps','Sharps',999,'[]',true,'equipment')" >/dev/null
q "UPDATE products SET catalogue_section='equipment', product_variants='[{\"id\":\"pk\",\"label\":\"5 Pack\",\"stock\":7,\"packSize\":5}]', stock_quantity=7 WHERE slug='pen'" >/dev/null
mkorder() { q "INSERT INTO orders (order_number, status, payment_confirmed) VALUES ($1, '$2', $3) RETURNING id"; }
additem() { q "INSERT INTO order_items (order_id, product_slug, product_name, variant_label, unit_price, quantity) VALUES ('$1','$2','x','$3',10,$4)" >/dev/null; }
stock() { q "SELECT (product_variants->0->>'stock')::int FROM products WHERE slug='$1'"; }

# 1. Unpaid order: no deduction.
O1=$(mkorder 1 pending_payment false); additem $O1 mt-1 10mg 2
check "unpaid: no deduction" "$(stock mt-1)" 9
check "unpaid: no ledger" "$(q "SELECT count(*) FROM inventory_movements WHERE kind='sale'")" 0

# 2. false->true UPDATE deducts once.
q "UPDATE orders SET payment_confirmed=true WHERE id='$O1'"
check "mark paid: deducted" "$(stock mt-1)" 7
check "mark paid: ledger row" "$(q "SELECT delta FROM inventory_movements WHERE kind='sale' AND reference='order:$O1'")" -2
check "mark paid: parent=sum variants" "$(q "SELECT stock_quantity FROM products WHERE slug='mt-1'")" 7

# 3. Replay: repeated settle + unconfirm/reconfirm never double-debit.
settle $O1 >/dev/null
q "UPDATE orders SET payment_confirmed=false WHERE id='$O1'"; q "UPDATE orders SET payment_confirmed=true WHERE id='$O1'"
check "replay: still 7" "$(stock mt-1)" 7
check "replay: one ledger row" "$(q "SELECT count(*) FROM inventory_movements WHERE kind='sale' AND reference='order:$O1'")" 1

# 4. Paid-at-INSERT before items exist; items inserted later settle.
O2=$(mkorder 2 processing true)
check "paid insert, no items yet: stock untouched" "$(stock mt-1)" 7
additem $O2 mt-1 10mg 1
check "items later: deducted" "$(stock mt-1)" 6

# 5. Same transaction: multi items, same SKU aggregated.
O3=$(mkorder 3 pending_payment false)
additem $O3 mt-1 10mg 1; additem $O3 mt-1 10mg 1
q "UPDATE orders SET payment_confirmed=true WHERE id='$O3'"
check "same-SKU lines aggregated" "$(stock mt-1)" 4
check "aggregated: single ledger row" "$(q "SELECT count(*) FROM inventory_movements WHERE kind='sale' AND reference='order:$O3'")" 1

# 6. Range kit = 10 physical vials.
q "INSERT INTO products (slug,name,stock_quantity,product_variants) VALUES ('reta','Reta',30,'[{\"id\":\"r10\",\"label\":\"10mg\",\"stock\":30}]')" >/dev/null
O4=$(mkorder 4 pending_payment false); additem $O4 reta '10mg · 10x Kit' 1
q "UPDATE orders SET payment_confirmed=true WHERE id='$O4'"
check "kit deducts 10" "$(q "SELECT (product_variants->0->>'stock')::int FROM products WHERE slug='reta'")" 20

# 7. Equipment multipack: stock counted in packs, no packSize multiply.
O5=$(mkorder 5 pending_payment false); additem $O5 pen '5 Pack' 2
q "UPDATE orders SET payment_confirmed=true WHERE id='$O5'"
check "multipack deducts packs not units" "$(q "SELECT (product_variants->0->>'stock')::int FROM products WHERE slug='pen'")" 5

# 8. Unlimited equipment skipped.
O6=$(mkorder 6 pending_payment false); additem $O6 sharps '' 3
q "UPDATE orders SET payment_confirmed=true WHERE id='$O6'"
check "unlimited skipped" "$(q "SELECT stock_quantity FROM products WHERE slug='sharps'")" 999
check "unlimited: no ledger" "$(q "SELECT count(*) FROM inventory_movements WHERE kind='sale' AND reference='order:$O6'")" 0

# 9. Insufficient stock on confirmed payment: durable exception, no deduction, payment truth kept.
O7=$(mkorder 7 pending_payment false); additem $O7 mt-1 10mg 50
q "UPDATE orders SET payment_confirmed=true WHERE id='$O7'"
check "insufficient: payment still confirmed" "$(q "SELECT payment_confirmed FROM orders WHERE id='$O7'")" t
check "insufficient: no deduction" "$(stock mt-1)" 4
check "insufficient: exception recorded" "$(q "SELECT reason FROM stock_settlement_exceptions WHERE order_id='$O7'")" insufficient_stock
check "insufficient: admin notified" "$(q "SELECT count(*) FROM admin_notifications WHERE order_id='$O7' AND kind='stock_settlement'")" 1
check "insufficient: no duplicate exception on replay" "$(settle $O7 >/dev/null; q "SELECT count(*) FROM stock_settlement_exceptions WHERE order_id='$O7'")" 1
# Retry after restock settles and resolves the exception.
q "UPDATE products SET product_variants='[{\"id\":\"v10\",\"label\":\"10mg\",\"stock\":60}]', stock_quantity=60 WHERE slug='mt-1'"
check "retry after restock settles" "$(retry $O7 | tail -c 200 | grep -o "settled\|exception" | head -1)" settled
check "retry deducted 50" "$(stock mt-1)" 10
check "exception resolved" "$(q "SELECT count(*) FROM stock_settlement_exceptions WHERE order_id='$O7' AND resolved_at IS NULL")" 0

# 10. Missing variant: explicit exception, never wrong-variant fallback.
O8=$(mkorder 8 pending_payment false); additem $O8 mt-1 '99mg' 1
q "UPDATE orders SET payment_confirmed=true WHERE id='$O8'"
check "missing variant: exception" "$(q "SELECT reason FROM stock_settlement_exceptions WHERE order_id='$O8'")" missing_variant
check "missing variant: no deduction" "$(stock mt-1)" 10

# 11. Settled paid order items are immutable.
check "settled items update blocked" "$(if $P -c "UPDATE order_items SET quantity=5 WHERE order_id='$O1'" >/dev/null 2>&1; then echo ok; else echo err; fi)" err
check "settled items delete blocked" "$(if $P -c "DELETE FROM order_items WHERE order_id='$O1'" >/dev/null 2>&1; then echo ok; else echo err; fi)" err

# 12. Refund/cancel never auto-restocks.
q "UPDATE orders SET refunded_at=now() WHERE id='$O1'"
check "refund: no restock" "$(stock mt-1)" 10
q "UPDATE orders SET status='cancelled' WHERE id='$O4'"
check "cancel after paid: no restock" "$(q "SELECT (product_variants->0->>'stock')::int FROM products WHERE slug='reta'")" 20

# 13. Cancelled-before-paid never settles even if later flipped paid flag off/on while cancelled.
O9=$(mkorder 9 cancelled false); additem $O9 mt-1 10mg 1
q "UPDATE orders SET payment_confirmed=true WHERE id='$O9'"
check "cancelled order: no deduction" "$(stock mt-1)" 10

# 14. Permissions: anon and non-admin cannot call directly.
check "anon forbidden" "$(if $P -tA -c "SET ROLE anon; SELECT settle_order_stock('$O1')" >/dev/null 2>&1; then echo ok; else echo err; fi)" err
check "non-admin forbidden" "$(if $P -tA -c "SET ROLE authenticated; SELECT set_config('test.uid','bbbbbbbb-0000-0000-0000-000000000002',false); SELECT settle_order_stock('$O1')" >/dev/null 2>&1; then echo ok; else echo err; fi)" err
check "admin allowed" "$(if $P -tA -c "SET ROLE authenticated; SELECT set_config('test.uid','$A',false); SELECT settle_order_stock('$O1')" >/dev/null 2>&1; then echo ok; else echo err; fi)" ok
check "exceptions not readable by non-admin" "$($P -tA -c "SET ROLE authenticated; SELECT set_config('test.uid','bbbbbbbb-0000-0000-0000-000000000002',false); SELECT count(*) FROM stock_settlement_exceptions" | tail -n1)" 0

# 15. Concurrent settlement of the same order: single debit, no error.
O10=$(mkorder 10 pending_payment false); additem $O10 mt-1 10mg 2
q "UPDATE orders SET payment_confirmed=true WHERE id='$O10'"
settle $O10 >/dev/null 2>&1 &
settle $O10 >/dev/null 2>&1 &
wait
check "concurrent: single ledger row" "$(q "SELECT count(*) FROM inventory_movements WHERE kind='sale' AND reference='order:$O10'")" 1
check "concurrent: deducted once" "$(stock mt-1)" 8

# 16. Rollback safety: failed order insert leaves no stock change.
BEFORE=$(stock mt-1)
$P -c "BEGIN; INSERT INTO orders (order_number,status,payment_confirmed) VALUES (11,'processing',true); ROLLBACK" >/dev/null 2>&1 || true
check "rolled-back paid insert: no deduction" "$(stock mt-1)" "$BEFORE"

echo; if [ $fail = 0 ]; then echo "ALL PASS"; else echo "FAILURES"; exit 1; fi

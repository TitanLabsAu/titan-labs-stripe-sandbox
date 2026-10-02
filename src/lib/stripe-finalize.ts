/** Arguments for finalize_checkout_order; owner is read from the attempt in SQL. */
export function finalizeArgs(paymentIntentId: string, attemptId: string, payload: any) {
  const c = payload.customer;
  return {
    _payment_intent_id: paymentIntentId,
    _attempt_id: attemptId,
    _subtotal: payload.totals.total - payload.totals.shipping,
    _shipping: payload.totals.shipping,
    _total: payload.totals.total,
    _contact_name: `${c.firstName} ${c.lastName}`.trim(),
    _contact_email: c.email,
    _contact_phone: c.phone,
    _shipping_address: c.shippingAddress,
    _notes: payload.notes,
    _items: payload.lines,
    _profile: {
      first_name: c.firstName,
      last_name: c.lastName,
      phone: c.phone,
      address_line: c.addressLine,
      city: c.city,
      state: c.state,
      postcode: c.postcode,
    },
  };
}

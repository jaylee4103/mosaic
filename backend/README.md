# Mosaic checkout test backend

## Verified sandbox run — September 26, 2026

One cart (`cart-demo-1`, checkout `checkout-7096de64-88b7-4264-923d-e4b250a33cf5`) completed two separate Stripe Link test payments. The backend retrieved each Checkout Session, PaymentIntent, and PaymentMethod directly from its merchant account and returned `link_test_payments_verified`.

| Store | Test account | Amount | Checkout Session | PaymentIntent | Result |
| --- | --- | ---: | --- | --- | --- |
| Store A | `acct_1UK0IbRvRbSRnMF6` | $1.00 | `cs_test_a1KV6NdcIkJG8LZY0HIlcnNhj1hvG4ZysQmtIvq6dlA3qD6S6F6t7E2OZH` | `pi_3UK0RsRvRbSRnMF60k5bM1g5` | `paid`, `link`, test mode |
| Store B | `acct_1UK0KI9070qdUoag` | $2.00 | `cs_test_a1nwkCLip1RvVgSH1H2WRAmsGBzQs0t4WN7mP3fqAEkJONauGpOlypa6WP` | `pi_3UK0SM9070qdUoag1AYWblic` | `paid`, `link`, test mode |

The two earlier Link CLI approvals were also confirmed as approved for the exact amounts: Store A `lsrq_1UJzzMFAjIHNUJquClKZjVnz` ($1.00) and Store B `lsrq_1UJzzPFAjIHNUJquabVDHcwO` ($2.00). Stripe test mode moves no real funds. No Mosaic sign-in or real store fulfillment was part of this run. The ignored `backend/.local/` directory holds local credentials and the checkout session state; do not commit it. The frontend does not yet use this backend.

This local service requests separate Stripe Link test mode approvals for two merchants in one $3 demo cart: $1 for Store A and $2 for Store B. It can then create a separate Stripe hosted Checkout Session in each merchant's **distinct test account**. The customer chooses Link and completes each test purchase. No Mosaic sign-in or real charge is involved.

Link shows one approval per store. These Link CLI approvals do not themselves pay either merchant. The backend checks the approved merchant totals, returns approval links and statuses, and never retrieves or stores card details. The Link CLI merchant URLs remain placeholder domains (`example.com` and `example.org`). The legacy local receipts say `paymentStatus: not_charged`; they do not prove that an external store accepted a payment.

The payment path requires two distinct Stripe test merchant accounts. Set `STRIPE_STORE_A_TEST_SECRET_KEY` and `STRIPE_STORE_B_TEST_SECRET_KEY` in the **server process environment** to their respective `sk_test_...` keys. Never commit them or put them in a frontend. The backend checks the account IDs are distinct before creating any Checkout Sessions. Each session has the exact cart amount and offers card and Link; a paid card transaction is reported as `non_link_payment_detected`, not as a verified Link purchase. Link availability depends on each merchant's Stripe test settings and eligibility.

For a local run, you can create the ignored file `backend/.local/merchant.env` in a text editor with these two lines, then run `chmod 600 backend/.local/merchant.env` from the repository root:

```text
STRIPE_STORE_A_TEST_SECRET_KEY=sk_test_...
STRIPE_STORE_B_TEST_SECRET_KEY=sk_test_...
```

Start with `node --env-file=.local/merchant.env src/server.mjs` from `backend/`. The `.local/` directory is excluded from Git. Setting variables in a different terminal will not configure an already running server.

## Run

```sh
cd backend
npm install
npm start
```

The developer running the backend must first connect the Link CLI with `npx link-cli auth login` on that machine. Then:

1. `GET http://127.0.0.1:3000/api/demo/cart` shows the cart and exact merchant totals.
2. `POST http://127.0.0.1:3000/api/demo/checkout` creates test mode Link requests and returns the approval URLs. Repeating this call returns the same requests while the server runs.
3. Approve each request in Link.
4. `GET http://127.0.0.1:3000/api/demo/checkout` refreshes the status. `approved_for_test_checkout` means both wallet approvals succeeded.
5. `POST http://127.0.0.1:3000/api/demo/checkout/payments` checks approvals and merchant accounts, then creates two **unpaid** Stripe test Checkout Sessions. It returns one hosted URL per store. Creating these sessions does not authorize or capture a payment.
6. The customer opens each URL, checks the exact $1 or $2 amount and test mode, chooses Link, and makes the final purchase decision on Stripe's page. The user controls this step.
7. `GET http://127.0.0.1:3000/api/demo/checkout/payments` retrieves each merchant's Stripe Checkout Session, PaymentIntent, and PaymentMethod. Only `link_test_payments_verified` means both sessions were paid with Link in test mode for the exact amounts under distinct accounts.

The older `POST /api/demo/checkout/complete` creates **local simulated orders only**. Its `test_orders_created` status is not payment evidence.

The checkout session is saved in `backend/.local/checkout-session.json`, which is excluded from Git. Repeating payment preparation does not create duplicate Stripe Checkout Sessions for the same cart and merchants. An expired or canceled Checkout Session needs a new checkout ID before it can be retried.

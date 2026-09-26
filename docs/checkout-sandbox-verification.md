# Earlier Stripe sandbox verification

On September 26, 2026, the standalone prototype split one $3 demo cart into separate Stripe test purchases in two distinct merchant accounts. Store A's $1 Checkout Session `cs_test_a1KV6NdcIkJG8LZY0HIlcnNhj1hvG4ZysQmtIvq6dlA3qD6S6F6t7E2OZH` produced PaymentIntent `pi_3UK0RsRvRbSRnMF60k5bM1g5`. Store B's $2 Checkout Session `cs_test_a1nwkCLip1RvVgSH1H2WRAmsGBzQs0t4WN7mP3fqAEkJONauGpOlypa6WP` produced PaymentIntent `pi_3UK0SM9070qdUoag1AYWblic`. Both sessions reported `paid`, both PaymentIntents succeeded for the expected amount, both PaymentMethods had `type: link`, and Stripe reported `livemode: false`.

The two earlier Link CLI approvals were `lsrq_1UJzzMFAjIHNUJquClKZjVnz` for Store A and `lsrq_1UJzzPFAjIHNUJquabVDHcwO` for Store B. The buyer completed each final test purchase on Stripe's hosted page. No real funds moved or physical orders were fulfilled.

The Next.js port has not yet repeated that end-to-end payment run. Its local and production limits are in [`../apps/web/README.md`](../apps/web/README.md).

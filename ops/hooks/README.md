# ops/hooks - pre-push secret scan

Blocks a push when any commit being pushed **adds** text shaped like a credential:

| Rule | Shape |
| --- | --- |
| `anthropic-key` | Anthropic key prefix `sk-ant-` followed by key characters |
| `github-token`, `github-fine-grained-pat` | `gho_` `ghp_` `ghs_` `ghu_` `ghr_` and `github_pat_` |
| `google-api-key` | `AIza` followed by key characters |
| `square-access-token`, `square-oauth-secret` | Square `EAAA...`, `sq0atp-`, `sq0atb-`, `sq0csp-` (and `sandbox-` variants) |
| `paypal-access-token`, `paypal-braintree-token`, `paypal-secret-assignment` | PayPal `A21AA...`, Braintree `access_token$...`, `PAYPAL_*SECRET/TOKEN=<long value>` |

It scans only added lines in the pushed range, so old history never blocks a clean push. The report names rule, file, line and commit. **It never prints the matched value.**

## Turn it on

```
npm run hooks:install
```

That sets `core.hooksPath` to `ops/hooks` (`npm install` does it too through the `prepare` script). Do not bypass the hook with `--no-verify`; if it blocks a real secret, remove it and rotate the credential.

## Run it by hand

```
node ops/hooks/secret-scan.mjs --files path/to/file
echo "some text" | node ops/hooks/secret-scan.mjs --stdin
```

## Tests

```
npm run test:hooks
```

Fake keys in the test are assembled at runtime from obviously fake pieces (`FAKE` repeated), so the test file contains no key-shaped text. A line that is a deliberate fake fixture can carry the marker `secret-scan:allow` instead, but building it at runtime is preferred.

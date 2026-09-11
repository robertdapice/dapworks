# dapworks.com.au

Minimal holder site for Dapworks. Static HTML, deployed with GitHub Pages.

## Domains

- **dapworks.com.au** is the primary domain. The `CNAME` file in this repo tells GitHub Pages to serve the site there.
- **dapworks.co** is a Namecheap URL redirect (root and www) to https://dapworks.com.au.

## DNS (Namecheap BasicDNS) for dapworks.com.au

- `A @ 185.199.108.153`
- `A @ 185.199.109.153`
- `A @ 185.199.110.153`
- `A @ 185.199.111.153`
- `CNAME www robertdapice.github.io`

After DNS propagates, GitHub issues a certificate and "Enforce HTTPS" can be turned on in the repo's Pages settings.

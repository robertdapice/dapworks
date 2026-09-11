# dapworks.com.au

Minimal holder site for Dapworks. Static HTML, deployed with GitHub Pages.

To point the custom domain at this site once `dapworks.com.au` is registered:

1. Add a `CNAME` file containing `dapworks.com.au` to the repo root and push.
2. At the registrar, add these DNS records:
   - `A @ 185.199.108.153`
   - `A @ 185.199.109.153`
   - `A @ 185.199.110.153`
   - `A @ 185.199.111.153`
   - `CNAME www robertdapice.github.io`
3. In the repo's Pages settings, enable "Enforce HTTPS" once the certificate is issued.

# dapworks

Minimal holder site for Dapworks. Static HTML, deployed with GitHub Pages.

## Domains

- **dapworks.co** is the primary domain. The `CNAME` file in this repo tells GitHub Pages to serve the site there.
- **dapworks.com.au** is a Namecheap URL redirect (root and www) to https://dapworks.co.

## DNS (Namecheap BasicDNS) for dapworks.co

- `A @ 185.199.108.153`
- `A @ 185.199.109.153`
- `A @ 185.199.110.153`
- `A @ 185.199.111.153`
- `CNAME www robertdapice.github.io`
- `TXT @ v=spf1 include:_spf.google.com ~all`
- `TXT _dmarc v=DMARC1; p=none; rua=mailto:hello@dapworks.co`
- Email type: Namecheap free forwarding. hello@dapworks.co forwards to Rob's Gmail; outbound is Gmail "Send mail as" via smtp.gmail.com.

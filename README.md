# RELAY PROXY (badplace)

A local-only HTTP/HTTPS proxy that forwards your browser traffic through a
relay you deploy on **Google Apps Script**. It runs on your own machine, binds
to `127.0.0.1` only, and is meant for light web access when a network blocks
sites directly.

- **Not a VPN.** Only apps you point at the proxy use it.
- **Local only.** It listens on `127.0.0.1`; it is not an open proxy for others.
- **Author:** v7lthronyx (Aiden Azad) — https://github.com/v74all/badplace

---

## How it works

```
Browser / app  ->  127.0.0.1:8085 (this proxy)  ->  Google Apps Script relay  ->  target site
```

1. You deploy a small script on your own Google account as a web app.
2. This local proxy sends each request to that script as a JSON POST.
3. The script fetches the URL with Google's own servers and returns the response.
4. The proxy hands the response back to your browser.

Your network only needs `script.google.com` and `script.googleusercontent.com`
to be reachable. The relay runs inside Google, not on a server you rent.

---

## Read this first (honest limits)

- A free Google account allows **20,000 outbound fetches per day** (Apps Script
  URL Fetch quota). One modern web page can be 50–100 requests, so this is
  roughly **a few hundred page loads a day**. It suits reading, messaging and
  light browsing, **not** video, streaming or large downloads.
- Each fetched response is capped at **50 MB**, and each fetch can run up to
  **6 minutes**. Big files and live video do not work well.
- Requests leave from **Google's data-center IPs**. Some sites (for example
  services behind Cloudflare) may show a CAPTCHA or block those IPs.
- Speed is limited: every request makes a round trip through Google Apps Script,
  so it is slower than a direct connection or a real server.
- Using Apps Script as a general traffic relay can run against Google's Terms of
  Service, and Google may suspend accounts that it considers abusive. **Use a
  separate, throwaway Google account for this — never your main account.**
- This tool does not hide your IP from the sites you visit through it in every
  case, and it is **not** a replacement for a properly configured VPN or a
  server you control.

---

## Prerequisites

- Python 3.9 or newer.
- `curl` (used for the connectivity checks).
- A Google account you are willing to use for this (a separate one is strongly
  recommended).

---

## Step 1 — Deploy your relay on Google Apps Script

1. Open https://script.google.com and create a new project.
2. Delete the sample code and paste the contents of
   [`google-apps-script-relay.gs`](google-apps-script-relay.gs).
3. Change the first line so the key is your own long random secret:

   ```javascript
   const AUTH_KEY = "paste-a-long-random-secret-here";
   ```

4. Click **Deploy -> New deployment -> Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Copy the deployment URL. It ends in `/exec` and looks like
   `https://script.google.com/macros/s/XXXXXXXX/exec`.

When you later change the script, use **Manage deployments -> Edit -> Version:
New version** so the URL stays the same.

## Step 2 — Configure the client

Edit [`config.local.yaml`](config.local.yaml):

```yaml
mode: apps_script
apps_script_url: "https://script.google.com/macros/s/XXXXXXXX/exec"
auth_key: "paste-the-SAME-long-random-secret-here"
bind_host: 127.0.0.1
bind_port: 8085
socks_enabled: true
socks_port: 1080
doh_enabled: true
mitm_enabled: true
```

The `auth_key` here must match the `AUTH_KEY` in your script exactly. Without a
matching key the relay replies `unauthorized`, so a leaked URL alone cannot be
used by someone else to spend your Google quota.

## Step 3 — Run it

**Linux / macOS:**

```bash
git clone https://github.com/v74all/badplace.git
cd badplace
./run-local.sh
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/v74all/badplace.git
cd badplace
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python proxy.py --config config.local.yaml
```

Check the relay before browsing:

```bash
python proxy.py --check
```

## Step 4 — Point your browser at the proxy

**Chromium / Chrome (separate profile):**

```bash
chromium --proxy-server="http://127.0.0.1:8085" --user-data-dir="/tmp/relay-profile"
```

**Firefox:** Settings -> Network Settings -> Manual proxy. HTTP Proxy
`127.0.0.1` Port `8085`, also use it for HTTPS. No proxy for
`localhost, 127.0.0.1`.

---

## HTTPS (MITM) and the local certificate

To relay HTTPS, the proxy terminates TLS locally with a Certificate Authority it
generates on your machine, then re-fetches the page through the relay. For your
browser to trust it you install that CA (`ca/ca.pem`).

- The CA key (`ca/ca.key`) **never leaves your computer** and is stored with
  `chmod 600`. Keep the whole `ca/` folder private; anyone with `ca/ca.key`
  could impersonate sites to a browser that trusts your CA.
- Install `ca/ca.pem` only in the browser profile you use for this, and remove
  it when you are done.
- Many mobile and desktop apps (banking apps, messengers, some browsers with
  certificate pinning) will reject a user-installed CA and will not work through
  the proxy. That is expected.

If you do not need HTTPS, set `mitm_enabled: false` and only plain HTTP is
relayed.

---

## Optional — domain fronting

If your network blocks `script.google.com` by its name (SNI) but still lets
other Google domains through, you can make the relay connection present
`www.google.com` as the TLS name while routing to Apps Script by the HTTP Host
header. Enable it in `config.local.yaml`:

```yaml
front_enabled: true
front_sni: "www.google.com"
front_ips: []
```

Leave `front_ips` empty to resolve `www.google.com` normally, or list one or
more Google front-end IPs if your DNS is tampered with. This is an extra step
that may help on some networks and makes no difference on others; try the normal
mode first.

---

## Commands

```bash
./run-local.sh                 # start (Linux/macOS)
./stop-local.sh                # stop
python proxy.py --version      # print version
python proxy.py --check        # connectivity checks only, do not start
```

Health endpoints while running: `http://127.0.0.1:8085/health`,
`/test-google`, `/test-relay`.

---

## Security notes

- Binds to `127.0.0.1` only. No LAN or internet exposure.
- Full URLs, cookies and Authorization headers are not logged by default.
- Never commit or share `config.local.yaml` with a real `auth_key`, your
  deployment URL, or the `ca/` folder.
- You are responsible for following Google's Terms of Service and quotas. Misuse
  can lead to suspension of the account or deployment you use.

## راهنمای فارسی

این ابزار یک **پروکسی محلی** است که ترافیک مرورگر شما را از طریق یک relay که
خودتان روی **Google Apps Script** می‌سازید عبور می‌دهد. روی سیستم خودتان و فقط
روی `127.0.0.1` اجرا می‌شود. **این یک VPN نیست** و فقط برنامه‌هایی که به آن وصل
شوند از آن استفاده می‌کنند.

**قبل از هر چیز این‌ها را بدانید:**

- حساب رایگان گوگل روزانه حدود **۲۰٬۰۰۰ درخواست** اجازه می‌دهد؛ یعنی تقریباً چند
  صد بار باز کردن صفحه در روز. برای خواندن، پیام‌رسان و وب‌گردی سبک مناسب است،
  **نه** برای ویدیو، استریم یا دانلود بزرگ.
- هر پاسخ حداکثر ۵۰ مگابایت و هر درخواست حداکثر ۶ دقیقه. فایل بزرگ و ویدیوی زنده
  خوب کار نمی‌کند.
- درخواست‌ها از آی‌پی‌های دیتاسنتر گوگل خارج می‌شوند؛ بعضی سایت‌ها (مثلاً سایت‌های
  پشت Cloudflare) ممکن است کپچا نشان دهند.
- استفاده از Apps Script به‌عنوان relay عمومی می‌تواند با شرایط سرویس گوگل در
  تضاد باشد و گوگل ممکن است حساب را محدود کند. **با یک حساب گوگل جدا و
  یک‌بارمصرف انجام دهید، نه حساب اصلی.**

**مراحل:**

۱. در https://script.google.com یک پروژه بسازید و کد
`google-apps-script-relay.gs` را کپی کنید.
۲. مقدار `AUTH_KEY` را به یک رمز تصادفی طولانی تغییر دهید.
۳. از مسیر Deploy -> New deployment -> Web app با گزینه‌های «Execute as: Me» و
«Who has access: Anyone» منتشر کنید و URL پایانی `/exec` را بردارید.
۴. در `config.local.yaml`، همان `apps_script_url` و `auth_key` را بگذارید (کلید
باید دقیقاً با کلید داخل اسکریپت یکی باشد).
۵. اجرا: در لینوکس `./run-local.sh` و در ویندوز با ساخت محیط مجازی و
`python proxy.py --config config.local.yaml`.
۶. مرورگر را روی `127.0.0.1:8085` تنظیم کنید.

برای HTTPS باید گواهی محلی `ca/ca.pem` را فقط در همان پروفایل مرورگر نصب کنید؛
کلید `ca/ca.key` را با کسی به اشتراک نگذارید. اگر شبکه‌ی شما نام
`script.google.com` را ببندد، می‌توانید گزینه‌ی `front_enabled: true` را امتحان
کنید؛ روی بعضی شبکه‌ها کمک می‌کند و روی بعضی فرقی ندارد.

---

## License

MIT — see [LICENSE](LICENSE).

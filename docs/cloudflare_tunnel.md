# SmoothStudy.ai Deployment & Tunneling Report

## 1. Project Overview

I successfully migrated the domain **smoothstudy.ai** from GoDaddy to Cloudflare to establish a secure, permanent tunnel between my local MacBook Pro development environment and the public internet.

---

## 2. Steps Taken

### Phase 1: DNS Migration & Cleanup

- **Nameserver Update:** I changed the authoritative nameservers in GoDaddy to Cloudflare's servers. This transferred management of the domain's traffic to Cloudflare.
- **Record Cleanup:** I manually deleted the pre-existing **A Records** in the Cloudflare DNS dashboard. These records were pointing to GoDaddy's default "parked" IP addresses and were blocking the tunnel from taking control of the domain.

### Phase 2: Tunnel Infrastructure

- **Installation:** I installed the `cloudflared` agent on my MacBook Pro using Homebrew.
- **Authentication:** I ran `cloudflared tunnel login` to authenticate my hardware with my Cloudflare account, generating a secure certificate (`cert.pem`) on my machine.
- **Creation:** I created a persistent tunnel named `smooth-server`. This generated a unique Tunnel UUID (`d950829b-31db-4b47-b9b2-fa8355a95b09`).

### Phase 3: Routing & Activation

- **DNS Routing:** I executed `cloudflared tunnel route dns smooth-server smoothstudy.ai`, which created a specialized CNAME record pointing my root domain to the tunnel.
- **Execution:** I initialized the tunnel connection, mapping my local application port (`localhost:3000`) to the public URL.

---

## 3. How It Works

The setup utilizes a **Zero Trust** architecture. Instead of opening vulnerable ports on my home router (Port Forwarding), the `cloudflared` daemon on my Mac creates an **outbound-only** connection to Cloudflare’s edge.

1. **User Request:** A visitor enters `smoothstudy.ai`.
2. **Cloudflare Edge:** Cloudflare intercepts the request and identifies the active tunnel link.
3. **Secure Pipe:** The request is passed through the encrypted tunnel to my MacBook.
4. **Local Response:** My local app processes the data and sends it back up the same secure pipe.

---

## 4. Operation Manual (How to Stop & Start)

### **To Stop the Tunnel:**

1. Navigate to the terminal window where the tunnel is active.
2. Press **`Ctrl + C`**.
3. _Result:_ The connection is severed, and the domain will display a 1033 error page.

### **To Start the Tunnel:**

1. Ensure the local application is running (e.g., `npm run dev`).
2. Open the terminal and run:

```bash
cloudflared tunnel run --url http://localhost:3000 smooth-server

```

3. _Result:_ The domain `smoothstudy.ai` will point back to the local instance.

---

## 5. Next Steps

- **Capture WWW Traffic:** Add a CNAME record in the Cloudflare Dashboard with the Name `www` and the Target `smoothstudy.ai` so that both versions of the URL work.
- **Background Service:** Convert the tunnel into a system service using `sudo cloudflared service install` so it starts automatically upon Mac reboot.
- **Security (Access):** For private "vibe" tools or admin panels, I can now add **Cloudflare Access** policies to require a "One-Time Pin" (OTP) sent to my email for login.

**Would you like me to show you how to set up that `www` redirect in the Cloudflare dashboard now?**

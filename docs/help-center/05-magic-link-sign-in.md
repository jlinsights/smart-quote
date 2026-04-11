# Signing in with magic links (no password needed)

> Audience: forwarding partners · Estimated read time: 2 minutes

BridgeLogis uses magic link sign-in as the default. Instead of
remembering yet another password, you enter your email and we send you
a single-use link that signs you in. This article covers how it works,
what to do when it doesn't, and why we built it this way.

## The happy path

1. Go to **bridgelogis.com/login**
2. Enter your work email
3. Click **Send magic link**
4. Check your inbox — the email arrives within 10 seconds
5. Click the link, and you're in

That's the whole flow. The link is valid for **15 minutes** and can
only be used **once**. After clicking it, your browser stays signed in
for the rest of your session.

## What if the email doesn't arrive

Check the usual suspects in this order:

1. **Spam or junk folder** — magic link emails sometimes land there,
   especially on corporate mail servers. Mark the sender as safe so
   future ones go to inbox.
2. **Correct email address** — typos happen. If you entered
   `partner@cmpany.com` instead of `partner@company.com`, we sent the
   link to nowhere.
3. **Corporate mail filtering** — some corporate filters quarantine
   links from unknown domains. Ask your IT team to whitelist
   `*.bridgelogis.com`.
4. **Rate limiting** — we allow three magic link requests per email
   per minute. If you click the button too many times, the extras are
   silently dropped. Wait 60 seconds and try again.

If all four fail, click the **Ask** button on the login page and we'll
check our delivery logs.

## What if the link says "expired" or "already used"

Magic links expire 15 minutes after we send them. They also self-
destruct after a single successful sign-in. Both error messages mean
the same thing practically: just request a new link.

The common reasons:

- You forwarded the email to another device and clicked it on both.
- You let the email sit for longer than 15 minutes.
- Your email client prefetched the link to scan it for viruses (some
  corporate spam filters do this), which used up the single-use token
  before you even clicked.

Corporate link prefetching is the sneakiest of these. If you see the
"already used" error repeatedly and you swear you never clicked,
prefetching is almost always the cause. Try using a personal email
address or ask your IT team to disable URL scanning for BridgeLogis.

## Why magic links instead of passwords

- **No password to forget or reset.**
- **No password to leak** — if our database is compromised, nothing
  useful comes out because we don't store any.
- **Less phishing surface** — there's no password field to trick you
  into typing into a fake site.
- **Single-use links mean a stolen link is useless** after the first
  click.

We still use passwords for admin accounts that need stronger
verification, so if you're an operator, you'll see a password prompt
instead.

## Still stuck?

Open the Intercom chat at the bottom right of any page and tell us
your email. We'll check the delivery log, confirm whether the link
was sent, and resend from our end if needed.

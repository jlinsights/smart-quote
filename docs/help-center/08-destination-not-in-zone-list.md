# What to do when a destination isn't in our zone list

> Audience: forwarding partners · Estimated read time: 2 minutes

Every now and then, you'll try to quote a destination and BridgeLogis
either shows you a surprisingly high number or falls back to the
highest zone. This article explains why it happens and the three
options you have.

## Why it happens

Carriers occasionally change zone assignments — usually once or twice
a year when UPS or DHL publishes a new service guide. BridgeLogis
updates the zone mappings on the same schedule, but there are a few
reasons a country might not be in our list:

- **The country is brand new to the carrier's network.** A few African
  and Pacific destinations get added each year.
- **The carrier doesn't serve the country at all.** In that case,
  there's genuinely no rate and the correct answer is "we can't ship
  there with this carrier".
- **We missed the update.** Rare, but possible. Tell us and we'll
  backfill within one business day.

When BridgeLogis can't match a country to a zone, it falls back to the
highest available zone (UPS Z10 or DHL Z8). That gives you a
conservative upper-bound number but usually isn't the rate you want
to quote to a customer.

## Option 1 — check the other carrier first

Some destinations are in one carrier's list but not the other's.
Always quote both UPS and DHL before assuming the lane is unavailable.
The side-by-side comparison takes two seconds.

## Option 2 — ask us for a hand-quote

If neither carrier auto-maps the destination, click the **Ask** button
on the quote or the Intercom chat and share the destination city,
estimated weight, and timeframe. We can usually get a rate from the
carrier account manager within a few hours during Seoul business hours
(09:00–18:00 KST, Mon–Fri).

Hand-quoted lanes typically come back as a one-off offer good for 7 to
30 days. Once you have the number, we can add it to BridgeLogis as a
custom entry so future quotes to the same destination run automatically.

## Option 3 — alternative routing

If the destination is unreachable by express but the customer has time,
we can sometimes suggest an alternative:

- **Express to a nearby hub, then local courier.** Works for remote
  islands and secondary cities in Southeast Asia.
- **Air cargo via a general sales agent (GSA).** Slower, cheaper, and
  outside the BridgeLogis express scope, but we can facilitate the
  introduction.
- **Ocean freight consolidation.** Only makes sense for non-urgent,
  heavy shipments.

Ask us on the chat and we'll tell you which option fits your shipment.

## What we do on our side

Every time a partner reports a missing destination, we log it and
check the latest carrier service guide. If the destination should be
in the list, we patch it within one business day and confirm with you.
If the carrier doesn't serve it, we document it as officially
unavailable so future attempts don't waste your time.

## A note on destination ZIP codes

For US, Canada, UK, and a handful of other countries, the zone alone
doesn't tell the whole story — specific zip codes have extended or
remote area surcharges on top. BridgeLogis auto-detects these for UPS
based on the zip code you enter. If your customer gives you a zip
that looks borderline remote (rural area, island, small town), always
enter it in the destination field so the EAS/RAS check runs.

When in doubt, ask. It's literally why we built the chat widget.

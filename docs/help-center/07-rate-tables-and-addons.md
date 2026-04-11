# Accessing rate tables and add-on fees

> Audience: admin users · Estimated read time: 3 minutes

BridgeLogis uses the same rate tables and add-on schedules that UPS
and DHL publish, updated whenever the carriers publish new ones. This
article explains where to find them in the admin panel and how to read
them when a quote doesn't match your expectations.

## Rate tables

The **Rate Table Viewer** lives in the admin widget panel. It's
read-only — rate tables are source-controlled and updated by us, not
edited in the UI — but you can look at the exact numbers used in any
quote.

You'll see two tabs: **UPS** and **DHL**. Each tab has two sub-tables:

- **Exact table** — covers 0.5 kg to 20 kg in fixed increments. When
  your billable weight falls on or below one of these weights, we look
  up the exact cell.
- **Range table** — covers 21 kg and above, with a per-kilogram rate.
  For a billable weight in this range, we multiply weight by the per-
  kg rate.

Both tables are indexed by zone (UPS: Z1–Z10, DHL: Z1–Z8). To check a
specific quote, look at the zone shown in the result, find the row in
the viewer that matches the billable weight, and cross-reference the
column for that zone. The base rate should match (before FSC and margin).

## Zone lookups

Zones map destination countries to a pricing tier. The mapping lives
in `src/config/ups_zones.ts` and `dhl_zones.ts` in the codebase and is
reflected in the Rate Table Viewer header.

A few zone examples:

- **UPS Z1**: Singapore, Taiwan, Macau, China
- **UPS Z5**: United States, Canada
- **UPS Z7**: Most of Western and Northern Europe
- **UPS Z9**: Israel, Jordan, Lebanon
- **DHL Z3**: Thailand, Philippines, Vietnam (varies)
- **DHL Z6**: Germany, France, UK, Italy, Spain

If your destination isn't listed in either viewer, that country defaults
to the highest zone (UPS Z10 or DHL Z8). Ask us before quoting — we
often have guidance for less-common destinations.

## Add-on fees

Add-ons are extras that apply on top of the base rate, depending on
shipment characteristics and destination. There are two groups:

### UPS add-ons (6 fees)

- **Residential delivery** — automatic based on address type
- **Delivery area surcharge (DAS)** — per zip code in remote US/CA
- **Extended area surcharge (EAS)** — broader rural fringe
- **Remote area surcharge (RAS)** — outside the normal service area
- **Surge fee** — auto-applied to Israel and select Middle East
  destinations when published
- **Oversized piece handling** — for shipments that exceed cube limits

For any shipment with a US or Canadian destination zip code, BridgeLogis
runs a binary search against the UPS EAS/RAS database and auto-applies
the fee if the zip is in the list. You'll see a banner in the UPS
add-on panel confirming the detection.

### DHL add-ons (19 fees)

DHL has more itemized fees including overweight (OWT), oversized (OSP),
non-stackable, dangerous goods surcharges, remote area, address
correction, Saturday delivery, and several others. Most auto-detect
based on the input — for example, a single piece over 30 kg triggers
OWT, and dimensions over 120 × 80 × 80 cm trigger OSP.

You'll see every applied add-on itemized in the quote result with its
per-unit rate and quantity, so you can always trace why the total is
what it is.

## Editing add-on rates

Admins can adjust add-on rates from the **Surcharge Management** widget
in the admin panel. Changes take effect immediately on new quotes and
are stored in the backend (not just local storage). They also appear in
the audit log so you can track who changed what.

Use this power carefully — every admin edit overrides the published
carrier rate for every future quote on your account.

## One more thing

When in doubt, run the same quote twice — once with UPS and once with
DHL. The Rate Table Viewer will tell you where the numbers came from,
and the add-on panel will show you every surcharge on top. If something
still looks wrong, click the **Ask** button on a saved quote and we'll
dig in together.

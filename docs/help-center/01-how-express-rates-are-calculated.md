# How express rates are calculated on BridgeLogis

> Audience: forwarding partners · Estimated read time: 3 minutes

BridgeLogis calculates a complete door-to-door express quote in one pass,
mirroring the same logic used by UPS and DHL themselves. This article walks
through each layer so you can read a quote confidently — and explain it to
your customer.

## The four layers of a quote

Every quote goes through the same pipeline, regardless of destination or
carrier:

1. **Item costs** — physical handling of the shipment in Korea
2. **Carrier costs** — the line-haul charge billed by UPS or DHL
3. **Margin** — our markup, applied automatically from your profile
4. **Warnings** — optional notes for low margin, heavy volumetric, etc.

You'll see all four reflected in the result panel as soon as you enter
origin, destination, weight, and dimensions.

## 1. Item costs

We start with the raw box. Two rules apply before anything else:

- **Packing dimensions are rounded up.** We add +10cm to length and width
  and +15cm to height to account for real-world packing material. If you
  tell us the outer dimensions are already final, use the "packing type"
  selector to override this.
- **Volumetric weight uses L × W × H ÷ 5000.** If this exceeds the actual
  weight, the carrier bills by volume. BridgeLogis automatically picks the
  higher of the two (the "billable weight").

On top of that we add packing material, labor if applicable, and any
manual surge charges you've entered.

## 2. Carrier costs

Once we know the billable weight and destination, we run a zone lookup:

- **UPS** uses zones Z1 through Z10. For example, Japan is Z2, the United
  States is Z5, and Israel is Z9. Each zone has its own rate table.
- **DHL** uses zones Z1 through Z8, with a slightly different country
  assignment. Western Europe sits around Z6, Southeast Asia around Z3.

The rate table itself has two parts: an exact row for 0.5–20 kg and a
range row for 21 kg and above. We find the matching row, multiply by the
billable weight, and add the fuel surcharge (FSC) on top.

FSC is carrier-wide and updated weekly. You'll see the exact percentage
used at the bottom of every quote.

## 3. Margin

Your account has a margin profile. It's resolved in priority order:

- Per-user flat margins (priority 100) win first.
- Per-user weight-band margins (priority 90) come next.
- Nationality-based margins (priority 50) are the fallback.
- A platform default (priority 0) catches anything else.

We then calculate `revenue = cost ÷ (1 − margin%)` and round up to the
nearest KRW 100. If you're on admin mode, you can override the margin
manually at any time — the quote recalculates instantly.

## 4. Warnings

We flag anything worth double-checking:

- **Low margin (<10%)** — rare, but worth a glance.
- **High volumetric weight** — your actual weight is far below the billed
  weight. Consider repacking or a different carrier.
- **Manual surge charges** — a reminder that the quote isn't purely from
  the tariff.
- **Collect-style Incoterms (EXW/FOB)** — we show a warning because UPS
  and DHL express on BridgeLogis are DAP only.

## One final note

Every saved quote stores the exact FSC%, FX rate, and margin rule ID used
at the moment of saving. If rates change next week, your historical quote
is still reproducible to the won. That's why we never silently mutate old
quotes.

If a quote doesn't match what you expected, open the detail view and
compare the four layers above — one of them will always explain the gap.

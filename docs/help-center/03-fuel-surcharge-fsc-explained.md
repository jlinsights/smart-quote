# Understanding fuel surcharges (FSC) and how we update them

> Audience: forwarding partners · Estimated read time: 2 minutes

Fuel surcharges are the single most volatile line on an express quote.
If you've ever seen a quote you sent on Monday look wrong by Thursday,
FSC is usually why. Here's how BridgeLogis handles it.

## What FSC actually is

FSC is a percentage that UPS and DHL add on top of the base rate,
published monthly by each carrier. It compensates them for jet fuel
price swings without requiring them to reprint their rate tables every
few weeks. When oil is expensive, FSC goes up. When oil is cheap, FSC
goes down.

FSC is **always applied after the base rate**, not before. So a 20,000
KRW base line with 46% FSC becomes 20,000 + 9,200 = 29,200 KRW before
margin.

## How BridgeLogis stores FSC

We keep one global rate per carrier — UPS and DHL — in the admin panel.
Whenever you run a quote, the current percentage is automatically
applied to the base rate. You can see which percentage is in effect at
the bottom of every quote result, right under the total.

We also store the FSC% with every saved quote. This means historical
quotes never silently drift when we update the rate — they freeze at
whatever value was live when you hit Save.

## When we update FSC

Every Monday morning (Seoul time), we check the UPS and DHL public
notices and update both rates if they've changed. If a carrier
publishes mid-month (which does happen), we update within the same
business day.

Admins can also override FSC manually from the admin widget panel.
This is useful when a carrier gives your account a custom rate
different from the public schedule — you set it once and every future
quote reflects it.

## What to do if a quote looks wrong

1. Open the saved quote and check the FSC% at the bottom of the result.
2. Compare it to the current FSC% shown in the admin FSC widget (if
   you're an admin) or ask us via the "Ask about this quote" button.
3. If there's a mismatch and you want a refreshed number, just
   duplicate the quote — the new one will use the current FSC.

Never manually edit an old quote to "update" its FSC. Duplicating
preserves the audit trail and keeps the original intact.

## One common question

**"Why is UPS FSC different from DHL FSC?"** — because each carrier
calculates it independently using their own fuel baseline, hedging
contracts, and fleet mix. It's normal to see a 5–10 percentage point
gap between them at any given time.

If the gap looks unusually wide, ping us — sometimes it's a publishing
delay and we can update within minutes.

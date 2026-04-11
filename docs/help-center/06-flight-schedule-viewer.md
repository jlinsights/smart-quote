# Using the flight schedule viewer (/schedule)

> Audience: admin users · Estimated read time: 3 minutes

The `/schedule` page shows you what's actually flying out of Incheon
this week, grouped by carrier and route. It's admin-only because the
information is operational (cut-offs, terminals, day-of-week patterns)
and we don't want to mislead customers with stale schedules.

## What the page shows

At the top, you get a world map with animated routes from ICN to each
destination, color-coded by carrier. Click any route to pin it — the
flight table below filters to that specific lane.

The flight table below the map has one row per scheduled flight, with
columns for:

- **Carrier** — airline code and name
- **Flight number**
- **Aircraft type** — so you know if it's a passenger belly or a
  freighter
- **Origin and destination**
- **Departure days** — shown as Su Mo Tu We Th Fr Sa with active days
  highlighted
- **Departure and arrival times** — KST for departures, local time for
  arrivals
- **Flight duration**
- **Max cargo capacity** — rough tonnage the aircraft can accept
- **Remarks** — cut-off times, terminal info, handling restrictions

## The effective-window system

Some flights have different schedules depending on the week — for
example, SU (Aeroflot) rotations change every 10–14 days. BridgeLogis
handles this automatically:

- Each schedule entry can have an `Effective From` and `Effective To`
  date.
- The page only shows entries that are active on today's date.
- When an entry expires, the next one in line takes over without any
  manual switch.

This means you can trust the page to reflect what's actually flying
today. If you want to plan ahead, we're building a "show upcoming
entries" toggle — it's not live yet, ask us if you need it sooner.

## Editing a schedule

Click the pencil icon on any row to open the edit modal. You can
adjust all fields, including the effective window. A few tips:

- **Day toggle** — click the day buttons to add or remove departure
  days. They sort automatically.
- **Origin and destination** — must be 3-letter IATA airport codes
  (ICN, LAX, FRA, etc.). We uppercase them automatically.
- **Effective window** — leave blank for "always active". Fill both
  for a bounded window. Fill just one end for open-ended.
- **Remarks** — freeform text, no length limit. Use it for anything
  operational that the columns don't cover.

Changes are stored in your browser's local storage, so they're visible
to you immediately but don't affect other admins. If you want a change
to be permanent, let us know and we'll merge it into the shared data.

## Hiding a flight

Click the trash icon to remove a flight from your view. It's soft-
deleted — we remember which flights you've hidden, and you can reset
from the **Reset to defaults** button if you want them back.

## Adding a new flight

Click **Add Flight** at the top. Fill in the form and save. New custom
flights are marked with a small badge so you can tell them apart from
the defaults we maintain.

## Why this is admin-only

Because we update the default schedules manually when GSSA partners
send us new PDFs, there's always a small chance the data is a day or
two stale. Customers would treat it as authoritative; admins know
better. If you want a customer-facing schedule widget, talk to us —
we're happy to build one with a clear "last updated" marker.

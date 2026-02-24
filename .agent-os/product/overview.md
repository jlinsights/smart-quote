# Smart Quote System - Product Overview

## Product Vision
An internal logistics quoting application for **Goodman GLS** and **J-Ways** that automates the complex calculation of integrated shipping costs including domestic pickup, export packing, and international air freight (UPS).

## Target Users
- **Internal Operations Staff**: Goodman GLS / J-Ways logistics coordinators who need to generate quotes quickly
- **Sales Team**: Prepare customer-facing quotes with margin protection
- **Management**: Monitor pricing, margins, and rate competitiveness

## Problem Solved
Manual quote calculations involving domestic trucking, packing, UPS international freight, surcharges, duties, and margin analysis are time-consuming and error-prone. Smart Quote automates the entire flow with real-time calculations.

## Current State
- **Phase**: MVP Complete + API Migration
- **Frontend**: Fully functional React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Rails 8 API (ported from TypeScript frontend logic)
- **Deployment**: Vercel (frontend) + Render (Rails API + PostgreSQL)
- **No Database Models Yet**: Pure calculation API, no data persistence

## Key Differentiators
- Real-time debounced calculation (500ms)
- Smart truck selection based on weight/CBM
- UPS 2025 Tariff with zone-based pricing (C3-C11)
- Surge/surcharge auto-detection (AHS, Large Package, Over Max)
- PDF quote generation with branded output
- Dark mode + Desktop/Mobile responsive layouts
- Auto exchange rate + FSC updates

---
name: Receipt Graveyard Resolver
description: A warm, clear interface for expense receipt review.
colors:
  ledger-orange: "#ea580c"
  ledger-orange-hover: "#c2410c"
  canvas: "#f9fafb"
  paper: "#ffffff"
  ink: "#1c1917"
  muted-ink: "#78716c"
  divider: "#e7e5e4"
  success: "#059669"
  warning: "#d97706"
  danger: "#dc2626"
  information: "#0284c7"
  dark-canvas: "#0c0a09"
  dark-paper: "#171412"
  dark-ink: "#f5f5f4"
typography:
  display:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-orange}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.ledger-orange-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  status-chip:
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: Receipt Graveyard Resolver

## Overview

**Creative North Star: "The Digital Finance Ledger"**

The interface should feel calm, trustworthy, and structured, with the warmth of a practical finance tool rather than the chill of a generic enterprise template. Geist Variable keeps dense expense information direct and easy to scan. Ledger Orange is the action accent; generous white and warm-neutral surfaces carry the working content.

The current code contains two visual generations: dashboard components still use indigo legacy variables, while the global palette and newer surfaces use orange. Treat orange as the primary accent for future work and avoid extending the legacy indigo styling. The existing UI uses soft card shadows; the preferred depth language is flatter, using borders and tonal surfaces first and minimizing shadows.

**Key Characteristics:**
- Warm, precise, and operational
- Orange actions against calm neutral work surfaces
- Clear status colors with text labels
- Border-led structure with restrained depth

## Colors

The palette pairs warm Ledger Orange with paper-like neutrals; success, warning, danger, and information colors communicate review outcomes.

### Primary
- **Ledger Orange** (`{colors.ledger-orange}`): Main action color in global tokens and newer screens. Use for primary actions, active navigation, and focused accents.
- **Deep Ledger Orange** (`{colors.ledger-orange-hover}`): Hover color for orange actions.

### Secondary
- **Clear Success Green** (`{colors.success}`): Approved and successful states. Pair with a readable status label.
- **Review Amber** (`{colors.warning}`): Warnings and items that need attention.
- **Decision Red** (`{colors.danger}`): Rejected, destructive, or blocking states.
- **Information Blue** (`{colors.information}`): Informational status where a warm accent would imply action or risk.

### Neutral
- **Soft Canvas** (`{colors.canvas}`): Light page background.
- **Paper White** (`{colors.paper}`): Cards, fields, and primary content surfaces.
- **Warm Ink** (`{colors.ink}`): Main text on light surfaces.
- **Muted Stone** (`{colors.muted-ink}`): Supporting labels and secondary information.
- **Warm Divider** (`{colors.divider}`): Borders and separators.
- **Night Canvas** (`{colors.dark-canvas}`), **Night Surface** (`{colors.dark-paper}`), and **Night Text** (`{colors.dark-ink}`): Dark theme background, cards, and primary text.

**The Status-Has-a-Label Rule.** Color reinforces a status; the status text remains visible and understandable without color.

## Typography

**Display Font:** Geist Variable (sans-serif fallback)
**Body Font:** Geist Variable (sans-serif fallback)
**Label/Mono Font:** Geist Variable for labels; monospace is reserved for receipt-like or code data.

**Character:** Geist Variable is compact and highly legible for tables, amounts, and operational labels. Use weight and size to establish hierarchy rather than introducing a second display face.

### Hierarchy
- **Display** (700, 1.75rem, 1.2): Main page or dashboard heading.
- **Headline** (700, 1.45rem, 1.2): Prominent welcome and section introductions.
- **Title** (700, 1.15–1.25rem, 1.2): Card and section titles.
- **Body** (400, 0.9rem, 1.5): Explanations and everyday interface copy.
- **Label** (600, 0.7–0.85rem, 1.2, occasional uppercase and tracking): Metadata, compact labels, and table headings.

**The Scan-First Rule.** Keep amounts, statuses, and vendor names visually distinct from their supporting metadata.

## Layout

The application uses a persistent left navigation rail at wide sizes, a sticky top header, and a centered content region capped around 1380px. The desktop sidebar is 260px wide; page content commonly uses 28px padding. Cards and dashboard regions use a 4-column metric grid and 16–28px gaps where space allows.

At widths below 900px, navigation becomes an off-canvas menu and content padding tightens to 18px vertically and 14px horizontally. Keep receipt review and tabular data readable by collapsing columns or stacking content before forcing narrow horizontal layouts. The submission surface switches to a single-column flow below 768px.

## Elevation & Depth

The current implementation combines fine borders and low, diffuse card shadows. For future work, follow the confirmed flat preference: use surface contrast and borders to establish groups, with shadows minimized and reserved for overlays or a clear interactive state. Avoid using a floating-card effect as the default hierarchy.

### Shadow Vocabulary
- **Current card shadow** (`0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`): Present in legacy dashboard cards; do not extend as the default for new surfaces.
- **Current hover shadow** (`0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`): Existing card hover treatment; use sparingly where interaction needs elevation.

## Shapes

The interface uses modest rounded corners rather than sharp geometry or oversized pill shapes. The common surface and button radius is 8px, with some newer components using 12px. Use thin neutral borders to define cards and fields. Reserve full pills for status badges and compact tags.

## Components

### Buttons
- **Character:** Quiet and precise, with a clear action hierarchy.
- **Shape:** Rounded rectangle (8px).
- **Primary:** Ledger Orange with white text; common call-to-action padding is 12px 20px.
- **Hover / Focus:** Darken orange on hover. Keep a visible focus ring; the global input and button system uses the orange ring token.
- **Secondary / Ghost:** Neutral surface or transparent background with a readable border or hover fill.

### Chips
- **Style:** Compact rounded status labels with a tinted background and readable text; the existing status badge is fully pill-shaped.
- **State:** Approved uses green, flagged and pending use amber, rejected uses red, and default states use neutral gray. Keep the status word in the chip.

### Cards / Containers
- **Corner Style:** 8px in the main dashboard, with 12px used in newer surfaces.
- **Background:** White or theme surface against a light-gray canvas; dark mode uses dark charcoal surfaces.
- **Shadow Strategy:** Prefer border and surface contrast; minimize the existing low card shadow on new work.
- **Border:** One-pixel neutral border is common.
- **Internal Padding:** Common card padding is 20–24px.

### Inputs / Fields
- **Style:** Full-width white or transparent fields with a thin neutral border and an 8px radius.
- **Focus:** Orange border and visible focus ring.
- **Error / Disabled:** Use the established red destructive color for errors; disabled controls are visibly muted and non-interactive.

### Navigation
- **Style:** 260px white sidebar with compact icon-and-label links, a thin divider, and orange active state in the global visual direction.
- **Mobile treatment:** Sidebar becomes an off-canvas menu below 900px; preserve a clear menu control and active destination.

### Metric Cards
- **Style:** Label, prominent value, and supporting context in a bordered surface. Small icon tiles use a pale semantic tint.
- **Behavior:** Existing cards lift slightly on hover; future versions should make hover movement subtle and avoid relying on lift to communicate hierarchy.

## Do's and Don'ts

### Do:
- **Do** use Ledger Orange as the primary accent for future surfaces.
- **Do** use warm neutral surfaces and thin borders to organize dense expense information.
- **Do** pair semantic status colors with plain status text.
- **Do** preserve readable focus states and adapt the sidebar and grids for smaller screens.
- **Do** use Geist Variable consistently for interface text.

### Don't:
- **Don't** extend the legacy indigo dashboard accent into new components.
- **Don't** use shadow as the default separator between cards.
- **Don't** make status meaning depend on color alone.
- **Don't** add decorative display typography that competes with amounts, statuses, or receipt data.

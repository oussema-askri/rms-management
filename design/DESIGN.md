# Design System Specification: Maritime Industrial B2B

## 1. Overview & Creative North Star: "The Nautical Architect"
The design system is built upon the concept of **"The Nautical Architect."** We are moving away from the cluttered, "dashboard-heavy" aesthetics of typical industrial software. Instead, we embrace a high-end editorial approach that combines the precision of naval engineering with the prestige of a luxury maritime house.

Our Creative North Star balances **Industrial Authority** (weight, structure, and reliability) with **Architectural Fluidity** (asymmetry, layered depths, and breathability). We break the "template" look by using exaggerated typographic scales and tonal layering rather than rigid grids and borders. This system must feel as sturdy as a hull and as refined as a captain’s quarters.

---

## 2. Color & Tonal Architecture
The palette is rooted in the depth of the ocean (`primary`) and the warmth of polished brass (`secondary`).

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries are defined through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the definition needed. If you feel the urge to draw a line, use white space instead.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
- **Base Layer:** `surface` (#fbf9f5) – The canvas.
- **Sectioning:** `surface-container-low` (#f5f3ef) – Used for large secondary regions.
- **Interaction/Content Hubs:** `surface-container` (#f0eeea) or `surface-container-highest` (#e4e2de) – Used to pull important data forward.

### Signature Textures & Glass
- **The "Brass" Gradient:** For primary CTAs and high-level highlights, use a subtle linear gradient from `secondary` (#785a00) to `on-secondary-container` (#745700) at 135 degrees. This adds a "metallic soul" that flat colors lack.
- **Glassmorphism:** For floating navigation or modal overlays, use `surface` at 85% opacity with a 12px backdrop-blur. This ensures the maritime "background" (the work) is never fully lost.

---

## 3. Typography: Editorial Authority
We utilize **Manrope** for high-impact display and **Inter** for precision data. This pairing bridges the gap between a premium brand and a functional tool.

*   **Display (Manrope):** Large, bold, and unapologetic. Used for dashboard summaries (e.g., "État de la Flotte").
*   **Headline (Manrope):** Semi-bold with tight letter-spacing (-0.02em). Provides an architectural "header" feel.
*   **Body & Labels (Inter):** High-legibility, standard tracking. Essential for high-density French UI strings where word length is typically 20% longer than English.

**Hierarchy as Brand:** Use `display-lg` in `primary` (#003664) for key metrics, making them the "anchor" of the page. Use `label-sm` in `secondary` (#785a00) for metadata to create a "technical blueprint" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "pop"; we use them to create "atmosphere."

*   **The Layering Principle:** Depth is achieved by stacking `surface-container` tiers. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft lift.
*   **Ambient Shadows:** When an element must float (e.g., a "Nouveau Rapport" FAB), use a shadow tinted with `primary`: `rgba(0, 54, 100, 0.08)` with a 24px blur and 8px Y-offset.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge (e.g., in high-glare outdoor use), use a **Ghost Border**: `outline-variant` (#c26b10) at 15% opacity. Never 100%.

---

## 5. Components

### Buttons & CTAs
- **Primary (Action Principale):** Large radius (12px), Brass Gradient, `on-secondary` text. 
- **Secondary (Action Secondaire):** `primary-container` (#1e4d80) with `on-primary` text. No borders.
- **Ghost (Tertiaire):** `on-surface` text with a subtle `surface-variant` background on hover.

### Cards & Lists (No-Divider Policy)
- **Forbid the use of divider lines.** Separate fleet items or repair logs using vertical white space (24px - 32px) or alternating tonal shifts between `surface-container-low` and `surface-container-lowest`.
- **Nautical Motif:** Apply a subtle, low-opacity (3%) SVG wave pattern or compass grid to the background of the "Active Repair" card to signify its priority.

### Input Fields (Champs de saisie)
- **Style:** Understated. A `surface-container-high` background with a bottom-only 2px "Ghost Border." On focus, the border transitions to `secondary` gold. 
- **Labels:** Always visible, `label-md` in `primary`.

### Chips (États & Statuts)
- **Status Markers:** Use high-contrast functional colors for status (e.g., *En cours*, *Terminé*, *Urgent*). 
- **Shape:** Rounded-full (pill) for status; Rounded-md (8px) for filters.

---

## 6. Do’s and Don’ts

### Do
- **Embrace White Space:** Treat space as a luxury. Industrial tools are often cramped; this design system wins by being "airy" yet organized.
- **Use French Context:** Design for long labels. "Repair Management" becomes "Gestion des réparations." Ensure containers can flex horizontally.
- **Layering over Outlining:** Always ask: "Can I define this area with a color shift instead of a line?"

### Don’t
- **Don’t use "Pure Black":** Use `on-surface` (#1b1c1a) for text to maintain the "Warm Off-white" premium feel.
- **Don’t use 90-degree corners:** Stick to the `md` (12px) and `lg` (16px) radius to soften the industrial "hardness."
- **Don’t use standard drop shadows:** Avoid the "cheap SaaS" look. Use the tinted Ambient Shadows described in Section 4.

### Accessibility Note
For outdoor port/dock use, ensure the `on-primary` and `on-secondary` contrast ratios exceed 4.5:1. In high-glare environments, the "Ghost Border" can be increased to 30% opacity to ensure container visibility.
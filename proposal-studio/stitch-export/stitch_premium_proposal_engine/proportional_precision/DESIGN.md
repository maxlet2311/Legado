---
name: Proportional Precision
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#434656'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004dea'
  primary: '#0041c8'
  on-primary: '#ffffff'
  primary-container: '#0055ff'
  on-primary-container: '#e3e6ff'
  inverse-primary: '#b6c4ff'
  secondary: '#50652a'
  on-secondary: '#ffffff'
  secondary-container: '#cfe99f'
  on-secondary-container: '#546a2e'
  tertiary: '#7a4100'
  on-tertiary: '#ffffff'
  tertiary-container: '#9d5500'
  on-tertiary-container: '#ffe2cd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b3'
  secondary-fixed: '#d2eca2'
  secondary-fixed-dim: '#b6d088'
  on-secondary-fixed: '#131f00'
  on-secondary-fixed-variant: '#394d14'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77c'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3900'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style
This design system is engineered for high-stakes financial environments where clarity and authority are paramount. The aesthetic is rooted in **Minimalism**, drawing inspiration from the precision of technical tools and the elegance of luxury editorial design. It prioritizes information density without clutter, ensuring that insurance advisors can navigate complex data with confidence.

The visual narrative focuses on "Quiet Luxury"—relying on impeccable typography, generous whitespace, and a disciplined color palette rather than decorative flourishes. The goal is to evoke an emotional response of absolute reliability and professional sophistication, positioning the product as an indispensable partner in high-impact consulting.

## Colors
The palette is architectural and grounded. **French Blue** is used sparingly for primary actions and brand presence. **Olive Green** and **Ochre** serve as sophisticated accents for status indicators or data visualization, providing a natural, "heritage" feel that contrasts the digital-first blue. 

A range of neutral grays (from `#F9FAFB` to `#121212`) defines the structure. Borders use a subtle, low-contrast gray to maintain a clean aesthetic. Backgrounds are predominantly white to maximize legibility and a sense of "premium space."

## Typography
The system utilizes **Inter** for its systematic, utilitarian precision. Tight letter-spacing is applied to larger headlines to create a customized, high-end feel. Weight distribution is purposeful: Semi-bold is reserved for structural hierarchy (headings, navigation), while Regular is used for long-form data and body copy to ensure maximum breathability. 

Small labels use a slight uppercase treatment with increased tracking to improve scannability in dense table layouts.

## Layout & Spacing
The layout follows a **Fixed Grid** approach for main content areas to maintain an editorial, structured look. A 12-column system is used for desktop, shifting to a single column for mobile. 

Spacing is governed by a 4px baseline grid. Elements are grouped using a "tight-to-loose" logic: related internal items use 8px–12px gaps, while major sections are separated by 48px–64px to create distinct visual "chapters" within the proposal workflow.

## Elevation & Depth
This design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**. Depth is conveyed through subtle background shifts (e.g., a light gray page background with white cards).

When shadows are necessary (such as for dropdowns or modals), they are "ambient"—extra-diffused with a 10-15% opacity and a large blur radius to feel like a soft glow rather than a hard drop shadow. Borders are 1px thick, using a neutral tint just dark enough to define edges without adding visual weight.

## Shapes
The shape language is disciplined and "Soft" (`roundedness: 1`). This 4px–8px radius provides a modern feel that is friendlier than sharp corners but more professional than the "bubbly" look of higher roundedness levels. Buttons and inputs share a consistent 6px radius. Selection indicators (like active tabs) use a sharp or 2px radius to feel precise.

## Components

### Sidebar
A collapsed or semi-permanent light gray (`#F9FAFB`) sidebar. Navigation items use `label-md` typography with a subtle French Blue vertical bar for active states. Icons are 20px, stroke-based (1.5px weight).

### Inputs & Tables
Inputs feature 1px neutral borders that darken on focus. No heavy inner shadows. Tables are the workhorse of the system: zero-border cells with subtle horizontal dividers. Headers use `label-sm` (uppercase) for a professional, data-driven look.

### Premium Cards
Cards should have no visible border but a very faint ambient shadow, or a 1px border with no shadow. Background is always pure white (`#FFFFFF`). Padding should be generous (24px or 32px) to signify "premium" content.

### Badges & Tabs
Badges use low-saturation versions of Olive Green and Ochre for status (e.g., "Approved" or "Pending") with dark text for accessibility. Tabs are minimalist—text-only with a simple underline for the active state, avoiding the "button-tab" look to keep the interface clean.

### Stepper & Progress
The stepper is a thin horizontal line with small numeric circles. Completed steps use French Blue; upcoming steps use a light gray. Progress bars are 4px thin, emphasizing precision over decorative volume.
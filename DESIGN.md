# ACS Web Apps design guide

Our visual direction is clean and minimal: warm off-white backgrounds, deep navy, restrained gold accents, and clear typography, following [ACS at Georgia Tech](https://www.acsgt.org/). The shared identity should feel familiar across apps while leaving each app room to serve its task.

This is the standard for new apps and redesigned controls. Existing interfaces adopt it gradually during relevant work; large visual migrations need their own reviewed issue. The home page currently uses its earlier blue palette. The [starter app](apps/_template/index.html) demonstrates the new baseline.

## Palette

| Role / CSS token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#faf9f6` | `#091c2b` | Page background |
| `--surface` | `#ffffff` | `#102b40` | Panels, menus, inputs |
| `--surface-hover` | `#f0f2ef` | `#19394f` | Hovered neutral controls |
| `--text` | `#163248` | `#faf9f6` | Main text |
| `--muted` | `#576773` | `#c8d5df` | Supporting text |
| `--border` | `#e0e4e4` | `#344e60` | Decorative separators |
| `--control-border` | `#78858d` | `#859aaa` | Input and control boundaries |
| `--accent` | `#082b46` | `#edc66b` | Primary actions, links, focus |
| `--accent-hover` | `#163f5e` | `#f5d78f` | Primary action hover |
| `--accent-soft` | `#edf1f4` | `#3b3424` | Selected backgrounds |
| `--accent-text` | `#ffffff` | `#082b46` | Text on accent backgrounds |
| `--danger` | `#a52f35` | `#ffb3b7` | Destructive actions and errors |

Copy tokens into each app's inline stylesheet; never load a shared stylesheet from outside its folder. The starter includes both system theme detection and an explicit `data-theme` override. Preserve existing theme storage keys when migrating apps.

Navy (`#082b46`) and gold (`#edc66b`) are the brand colors. Use navy for primary actions and links on light surfaces, and gold for those roles on dark surfaces. Keep supporting areas neutral and reserve gold highlights for emphasis. The dark palette is an app-specific adaptation of the reference site. Prefer whitespace and a single hairline border over tinted fills to separate areas. Use words and icons alongside color for errors, warnings, selections, and status. Preserve the home directory's `live`, `beta`, and `soon` status names.

## Typography and spacing

- Use `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` for app controls. Avoid new network font dependencies. Existing presentation typography may remain app-specific.
- Default body text: `1rem`, line height `1.6`. Supporting text should normally be at least `0.875rem`.
- Use a simple type scale: `0.875rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`. Scale presentation text to the display and content.
- Use a 4px spacing scale: `4`, `8`, `12`, `16`, `24`, `32`, `48`px. Start mobile layouts with 16px page padding and desktop layouts with 24–32px.
- Use 10px radii for controls and 16px for panels. Reserve pill shapes for tags and compact state controls.
- Favor borders and spacing over heavy shadows. Keep reading text around 65–75 characters per line; allow wider working areas when the task needs them.

## Layout and controls

Keep the app name and primary task visible. Give each screen one clear primary action. Put advanced options behind a labeled disclosure or settings control. Use About or the existing help menu for the optional ACS Web Apps project link.

Use native buttons, labeled inputs, and semantic headings. Action labels describe the result: “Start timer,” “Save verse,” or “Present lyrics.” Icon-only buttons need accessible names and a visible explanation such as a tooltip. A tooltip does not replace an accessible name.

Aim for at least 44 × 44px interactive targets, including help and close buttons. Show hover, focus, active, disabled, loading, and error states where applicable. Disabled controls need a nearby explanation when the reason is not obvious. Prevent accidental repeated submissions.

Make empty states useful: explain what belongs here and offer the first action. Explain errors in plain language with a recovery step. Ask for confirmation when an action irreversibly deletes user content; use undo when practical.

## Accessibility and themes

- Keep visible keyboard focus; a 3px accent outline with a 3px offset is the default.
- Check text contrast in both themes: aim for at least 4.5:1 for normal text and 3:1 for large text. Control boundaries and meaningful graphics should reach 3:1 against adjacent colors. Decorative borders may be subtler.
- Maintain usable layouts at 320 CSS pixels and 200% zoom. Avoid horizontal scrolling except for content that inherently needs it.
- Follow system theme by default. An explicit choice overrides it. Do not hide controls or content in either theme.
- Respect reduced motion. Keep animations brief and functional; never require animation to understand a result.
- Dialogs need a name, sensible initial focus, Escape handling where appropriate, and focus returned to their trigger. Dynamic results should be announced when a screen reader would otherwise miss them.

## Presentation and specialized views

Presentation output may use different colors, typefaces, and layouts to remain readable on projectors. Hide editing controls in the audience view. Keep the operator interface consistent with this guide, preserve keyboard controls, and test long content and small screens.

Charts, music tools, verse artwork, and learning feedback may need additional colors. Document their purpose in the app README, check contrast, and provide labels or shapes so meaning survives without color.

## Review evidence

For visible changes, attach before/after screenshots when useful, including light/dark and phone/desktop views. Record keyboard checks and any intentional exception. Screenshots support review; they do not replace testing the actual interaction.

A design exception is acceptable when it serves a specific task. Explain it in the PR. New visual direction or changes to shared tokens require project-lead approval and an update to this guide.

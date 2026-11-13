# App template

Copy this folder to `apps/<app-id>/` to start a self-contained ACS Web Apps app. Read the root [vision](../../VISION.md), [design guide](../../DESIGN.md), and [contribution workflow](../../CONTRIBUTING.md) before implementing a new app. New apps need project-lead agreement on their purpose and scope.

## Reference behavior

The template demonstrates the warm off-white backgrounds, navy, and gold palette from the design guide, system/light/dark theme selection, labeled controls, visible keyboard focus, a 44px minimum target size, responsive spacing, and an announced preview result. The message preview uses text content safely, stays in memory, and resets on reload. Theme selection also resets on reload; add app-specific persistence if needed.

The help menu explains installation and offline use and contains the optional project link. This example has no usage reporting. Registered apps must copy the existing self-contained `adless-usage` script from a registered app and use their actual folder identifier, following the root analytics policy.

## Files

- `index.html` — inline markup, CSS tokens, example form, theme selection, and guarded service-worker registration.
- `manifest.webmanifest` — app metadata, relative start URL, colors, and local icon.
- `sw.js` — offline cache; bump its version when cached files change.
- `icons/icon.svg` — placeholder icon to replace.

## New-app checklist

1. Agree on the user problem, smallest useful release, and acceptance criteria in an issue.
2. Copy this folder; replace the example interface, app name, title, description, help text, and README with actual behavior and limitations.
3. Update manifest metadata and replace the placeholder icons. Keep every required asset inside the app folder.
4. Add app-specific analytics only when registering the app. Never collect messages, searches, imported text, or other user content.
5. Update the service worker's file list and bump its version. Keep registration guarded for `file://` use.
6. Register in `assets/apps.js`, normally as `beta`. Keep existing public IDs stable; use the correct app-folder analytics identifier.
7. Run `python3 scripts/validate.py --base origin/main` from the repo root and test the main task, keyboard use, light/dark themes, mobile layout, offline reload, and standalone hosting.
8. Open a PR with screenshots and validation evidence. Obtain project-lead approval before merging a new app.

App assets use relative paths and never reference another app or the root assets folder. The optional “ACS Web Apps project” link in Help may use `../../`; it is allowed to be unavailable when hosted independently.

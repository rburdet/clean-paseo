# clean-paseo

A [Paseo](https://paseo.sh) plugin to bulk-archive workspaces.

It adds a **Clean up workspaces** item to the sidebar. The screen lists every active workspace sorted by last activity (oldest first), so you can select many and archive them in one go, with a confirmation step and per-workspace error reporting.

## Install

```sh
paseo plugin install /path/to/clean-paseo
```

Requires Paseo ≥ 0.15.0.

## Development

```sh
npm install
npm test          # unit tests (node --test)
npm run typecheck
paseo plugin reload clean-paseo
```

Note: Paseo 0.15.0 sends `activityAt: null` in workspace lists, so activity is derived from the latest of `activityAt`, `lastUserMessageAt`, `statusEnteredAt` and `createdAt`.

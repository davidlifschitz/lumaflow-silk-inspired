# LumaFlow — Generative Symmetry Art

A front-end-only, Silk-inspired generative art MVP. It intentionally avoids Silk's name, branding, assets, and exact proprietary brush implementation.

## Features

- Real-time mirrored/rotational drawing
- Touch, mouse, and Apple Pencil-compatible pointer input in mobile Safari
- Symmetry controls: 2, 4, 6, 8, or 12-way
- Mirror toggle
- Brush/eraser tools
- Brush width and glow controls
- Palettes and rainbow mode
- Undo, clear, keyboard shortcuts
- High-resolution PNG export
- Optional ambient sound using Web Audio

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## Next product improvements

- Custom palette creator
- Transparent PNG export
- Background color picker
- Layers
- Import photo/background image
- Session gallery with local thumbnails
- More brush algorithms: smoke, thread, plasma, stars
- App Store wrapper using Capacitor or a native SwiftUI shell

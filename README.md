# Jagadeesh Lanka | Mechanical Engineering Portfolio

Mechanical design, manufacturing, robotics and technical AI work, with a separate personal-project feature for AUREN.

Live site: https://lankajagadeesh.github.io/mechanical-ai-portfolio/

## Explore

- A cinematic dark "lab" theme with an intro loader, animated backdrop, skills marquee, toolkit grid and scroll reveals.
- A physically lit hero assembly tessellated from the R1 STEP file: studio reflections, soft shadows, PBR metal and paint, a running timing belt and a live tension-travel simulation that redraws the belt as the plate slides.
- Three animated project scenes: a robotic work cell running a pick-and-place sequence, a TurtleBot-style robot with a spinning LiDAR and live ±15° front-sector check, and an iridescent single- and multi-wall carbon nanotube.
- Fifteen illustrative project demos and a playable sorting mini-game.
- A separate AUREN voice-assistant prototype story and sample command walkthrough.
- Optional locally generated ambient sound, off until enabled, with volume control.
- Downloadable revised resume and technical drawings.

Files: `cinematic.css` (theme, layered over `style.css` and `theme.css`), `fx.js` (page motion), `scene-kit.js` (shared lighting, textures and render loop), `viewer.js` (hero assembly), `project-viewers.js` (project scenes). 3D scenes only render while on screen, and all motion stops when the visitor prefers reduced motion.

## Run locally

Run `node preview.mjs` in this folder, then open http://127.0.0.1:4173. No package install or build step is required. Use HTTP rather than opening index.html directly so browser modules and mesh data load correctly.

The site uses relative asset paths and can run beneath a GitHub Pages repository path. It bundles runtime libraries and fonts locally. The shared visitor counter connects to jagadeesh-portfolio.goatcounter.com only on lankajagadeesh.github.io. Local previews do not record visits. The displayed total comes from GoatCounter and may take up to four hours to update; it is never simulated.

## Interaction and access

Drag 3D scenes to rotate, use Pause/Play to stop animation, or use arrow keys while the scene has focus. Plus/minus zoom and R resets. Assembly controls include top/front views, component highlighting and separated parts. Manual interaction pauses the scroll tour. Native controls, text alternatives and live descriptions support keyboard use. Reduced-motion preferences disable automatic visual motion. WebGL failure retains explanatory still images.

Ambient sound is generated with Web Audio. It starts off, fades smoothly and suspends while the tab is hidden. AUREN's demo uses sample commands without microphone access, desktop control or an AI connection.

## Evidence and ownership

The servo assembly, drawings and structural checks are from a September 2026 academic report extension developed with AI assistance. They are separate from internship contributions and are not original company CAD or a manufacturing release. The 22-solid STEP model uses simplified envelopes.

Other mechanical scenes are report-based explanatory reconstructions. The nanotechnology work is a literature review. Calculations and design estimates are labelled and are not presented as measured production results. Project demos are newly authored illustrative examples, not confidential task payloads or historical platform results. AUREN is an AI-assisted personal Windows prototype.

Three.js is distributed under the MIT license in assets/THREE-LICENSE.txt. DM Sans and Manrope include their OFL license files. Supplied report images and documents remain the property of their respective authors. No blanket license is assigned to those materials.

# Jagadeesh Lanka | Mechanical Engineering Portfolio

Mechanical design, manufacturing, robotics and technical AI work, with a separate personal-project feature for AUREN.

Live site: https://lankajagadeesh.github.io/mechanical-ai-portfolio/

## Explore

- A cinematic dark "lab" theme: intro loader, animated gear train and CAD dimension line in the hero, a rack-and-pinion scroll gauge, conveyor belts that run as you scroll, a skills marquee, toolkit grid and scroll reveals.
- A physically lit hero assembly tessellated from the R1 STEP file: studio reflections, soft shadows, PBR metal and paint, a running timing belt and a live tension-travel simulation that redraws the belt as the plate slides.
- A walk-behind floor scrubber that cleans a dirty tiled floor lane by lane; the driven-sprocket slider changes the chain drive ratio, wheel speed, torque and ground speed.
- A robotic work cell running a full pick-and-place sequence.
- A TurtleBot3 simulation that drives around an arena using the project's LiDAR logic (front ±15° sector, 0.5 m threshold, stop, wait 3 s, turn 90° clockwise). Click the floor to add obstacles.
- A multi-wall carbon nanotube in its radial breathing mode, with a single-wall option.
- A live simulation for every AI project (Mercor, and the Handshake AI projects), such as a planetary clutch with stick, slip and heat, a quantum wave packet, a CDC pipeline crash and replay, a root-cause regression and a playable sorting game.
- AUREN, a talking assistant: visitors can ask about my work and hear spoken replies; under my voice profile it drives a simulated desktop.
- A live GoatCounter visitor count and downloadable resume and drawings.

Files: `cinematic.css` (theme, layered over `style.css` and `theme.css`), `fx.js` (page motion), `scene-kit.js` (shared lighting, textures and render loop), `viewer.js` (hero assembly), `project-viewers.js` and `sim-builders.js` (3D project scenes), `sims.js` (AI project simulations), `auren.js` (assistant), `mech.js` (gears, scroll gauge, conveyors). 3D scenes only render while on screen, and all motion stops when the visitor prefers reduced motion.

## Run locally

Run `node preview.mjs` in this folder, then open http://127.0.0.1:4173. No package install or build step is required. Use HTTP rather than opening index.html directly so browser modules and mesh data load correctly.

The site uses relative asset paths and can run beneath a GitHub Pages repository path. It bundles runtime libraries and fonts locally. The visitor counter reports to jagadeesh-portfolio.goatcounter.com on lankajagadeesh.github.io and shows the live total. In GoatCounter settings, enable "Allow adding visitor counts on your website" so the total can be displayed.

## Interaction and access

Drag 3D scenes to rotate, use Pause/Play to stop animation, or use arrow keys while the scene has focus. Plus/minus zoom and R resets. Assembly controls include top/front views, component highlighting and separated parts. Manual interaction pauses the scroll tour. Native controls, text alternatives and live descriptions support keyboard use. Reduced-motion preferences disable automatic visual motion. WebGL failure retains explanatory still images.

Ambient sound is generated with Web Audio. It starts off, fades smoothly and suspends while the tab is hidden. AUREN's demo uses sample commands without microphone access, desktop control or an AI connection.

## Ownership

All projects, CAD, drawings, analysis, scenes and demos on this site are my own work, with team contributions credited where a project was a group effort.

Three.js is distributed under the MIT license in assets/THREE-LICENSE.txt. DM Sans and Manrope include their OFL license files.

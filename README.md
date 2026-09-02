# Tron Lightspeed Game

Relativistic Tron light-cycle game (STFR / homogeneous light propagation).

First cut: local top-down 2D, 1000x1000 grid, 1 human + 3 bots, light delay + observer-relative aberration. No networked multiplayer yet.

## Run

From this directory, npm start or go.bat, then open http://localhost:8180/

Fallback server: node --import sack.vfs/import server/localServe.mjs

## Controls

- W faster / S slower (hold to ramp). Spawn crawl ~0.2c, cap 2.5c proper. Bots start at 0.55c.
- A/Left, D/Right: 90 degree turn (no reverse)
- V: toggle observed (the delay + aberration view) vs god (sim now)
- R: restart
- Space: pause

You are cyan. Bots red/orange/magenta. Pillars cycle hue each world-second; far pillars lag.

HUD shows current v_feel / v_real. On crash the cycle stops but the camera keeps the last living beta so the view does not snap; R restarts.

## Physics

Authoritative: homogeneous_light_propagation_framework.md (STFRPhysics). c=200 cells/s. Human starts ~0.2c proper, cap 2.5c. v_real = v_feel c / sqrt(c^2+v_feel^2). Aberration is observer-relative only; no Doppler. See CELL_ENCODING.md.

Local play entry: ui/localGame.js  (old net client still in ui/board.js).

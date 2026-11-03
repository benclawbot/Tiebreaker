# Tennis motion recordings

Source: https://github.com/jdpulgarin/Tennis-MoCap, supplied ZIP revision 9af88bb4df4e78b22127719744fdca993ced2733.

Licensed under Creative Commons Attribution-ShareAlike 3.0 Unported: https://creativecommons.org/licenses/by-sa/3.0/ . The extracted, resampled motion clips are adaptations and retain this license. Changes: selected one complete stroke per category, scaled centimetres to metres, converted intrinsic ZXY Euler rotations to xyzw quaternions, and resampled from 100 Hz to 50 Hz. Source file and inclusive frame bounds are retained in each clip. No original frames are synthesized. Keep this notice with distributed motion assets.

Attribution requested by source: Pulgarin-Giraldo J.D., Alvarez-Meza A.M., Melo-Betancourt L.G., Ramos-Bermudez S., Castellanos-Dominguez G. **A Similarity Indicator for Differentiating Kinematic Performance Between Qualified Tennis Players.** Lecture Notes in Computer Science 10125, pp. 309–317, 2017. https://doi.org/10.1007/978-3-319-52277-7_38

## Data conventions

All six clips use the same performer (`adorozco`). Y is up. Rest skeleton points the anatomical left arm along +X, right arm along -X; toes point +Z. All local quaternion tracks use intrinsic ZXY source rotation order, stored as xyzw. Root positions and joint offsets are metres. World joint positions are included for retargeting/inspection, with original root orientation and location, not centered or yaw-normalized. Each clip retains its own hierarchy/offsets (use that, rather than the redundant root-level joints). Root orientation should be normalized once per clip before applying a game player's heading. Do not mirror the skeleton to switch serve boxes; rotate its heading, keeping its right-hand racket.

Contact time is **estimated**, since the recordings contain neither racket nor ball trajectories. Serve contact is the right-wrist maximum-height frame 224 (1.24 s into the cropped clip); overhead uses frame 125 at maximum extension (0.75 s into clip). Groundstroke and volley markers use the fast forward-swing wrist interval. Final contact must be corrected against the retargeted racket/ball in game. No locomotion cycles exist in these six gesture categories; use separate directional locomotion and blend by actual velocity.

## Reproduction and checks

Run `python process_mocap.py` with numpy, scipy and matplotlib. ZIP/outputs paths are near the top of that script. `signals.png` shows wrist heights and speeds for full takes. `stroke-contact-sheets.png` shows seven skeleton snapshots per selected stroke; red is the right side, blue the left. Both were inspected visually. The serve has left-arm toss, trophy, right-arm overhead extension and follow-through; other clips have distinct swings and recovery. All quaternion norms differ from 1 by under 1e-6; forward-kinematics edge lengths differ from rest offsets by under 2e-6 m after JSON rounding. Rendered-mesh retargeting and ball contact still need visual verification.

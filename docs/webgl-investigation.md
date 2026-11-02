# WebGL preview investigation

## Observation

On 2026-11-02, the managed preview browser loaded the HTML but three.js could not create its WebGL rendering context. The browser console reported `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` and `BindToCurrentSequence failed`, followed by `THREE.WebGLRenderer: Error creating WebGL context`. The UI correctly displayed a message rather than starting a match.

## What this establishes

The error originates during graphics-context creation in that particular managed browser, before scene and game logic initialization. The host has Mesa EGL libraries, but their presence does not establish that the browser process can access a functioning GL renderer. Installing a Node package in the project does not, by itself, enable the managed browser's graphics context.

This observation does not demonstrate a defect on Android Chrome, nor does it prove that every WebGL-capable browser will work. The match simulator and mocked view tests do not exercise a real GPU, canvas, touch screen, motion sensor or the visual alignment of the ball and racket.

## Reproduction and next checks

1. Run `python3 -m http.server 8000 --directory dist` and open `http://localhost:8000` in the target browser.
2. Open browser developer tools and inspect errors at page load. Check whether a WebGL 2 context can be created and whether browser graphics acceleration is enabled using the browser's own diagnostics.
3. On a physical Android device, use an HTTPS deployment and test a complete serve, return, rally, net approach and scoring sequence. Capture current screenshots and a short recording; record phone model, Android/Chrome version and observed frame rate.
4. Test a browser with working WebGL separately before changing game rendering code. If the error occurs there too, capture its console diagnostics and investigate asset loading, GPU context loss and resource limits.

The earlier screenshot in the README is a user-provided capture of an earlier build; it cannot validate the current deployment.

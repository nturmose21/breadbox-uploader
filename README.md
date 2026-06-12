# BREADBOX Web Uploader

Flash BREADBOX Arduino UNO projects from a browser.

This is a static GitHub Pages site. Customers open the site in Chrome or Edge, pick a project, choose their Arduino UNO serial port, and the browser uploads the compiled `.hex` firmware with Web Serial.

## Local Preview

```sh
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## GitHub Pages Launch

1. Create a new GitHub repository, for example `breadbox-uploader`.
2. Push the contents of this folder to the repository root.
3. In the GitHub repository, open `Settings`.
4. Open `Pages`.
5. Set `Source` to `Deploy from a branch`.
6. Set the branch to `main` and the folder to `/root`.
7. Save.

Your public URL will look like:

```text
https://YOUR-USERNAME.github.io/breadbox-uploader/
```

GitHub Pages can take a few minutes to publish after a push.

## Firmware

Compiled Arduino UNO firmware lives in:

```text
firmware/*.hex
```

The website reads:

```text
firmware/manifest.json
```

Build all firmware again:

```sh
tools/build-firmware.sh
```

Build one project:

```sh
tools/build-firmware.sh flappy-bird
```

## Browser Support

Web Serial requires a secure browser context. GitHub Pages uses HTTPS, and `localhost` also works for local preview. Chrome and Edge support Web Serial.

## Included Projects

- Flappy Bird
- Tetris
- Tiny Tetris
- Doom Raycaster
- Mini PC
- Calculator
- Multimeter Oscilloscope
- Dino Tamagotchi
- Tamagotchi
- Gyro Racer

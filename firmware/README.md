# Firmware Files

Put compiled Arduino UNO `.hex` files in this folder.

The filenames must match `manifest.json`, for example:

- `flappy-bird.hex`
- `tetris.hex`
- `doom.hex`

Run `../tools/build-firmware.sh` from the `breadbox-web-uploader` folder to build them with PlatformIO.

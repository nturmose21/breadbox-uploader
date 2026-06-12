#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$ROOT_DIR/breadbox-web-uploader"
OUT_DIR="$APP_DIR/firmware"
PIO_BIN="${PIO_BIN:-$HOME/.platformio/penv/bin/pio}"

mkdir -p "$OUT_DIR"

PROJECTS=(
  "flappy-bird|Arduino-Games-main/Flappy-Bird|Flappybird-hack_updt.ino"
  "tetris|Arduino-Games-main/Tetris|Tetris-hack_updt.ino"
  "tiny-tetris|arduino-Tiny-Tetris-main|Tiny_Tetris.ino"
  "doom|Doom|Doom.ino"
  "mini-pc|Mini-PC-Arduino-main|OledPC.ino"
  "calculator|Arduino-Uno-calculator--main/ardulator|Ardulator.ino"
  "multimeter-oscilloscope|Multimeter-oscilloscope-main|hack_updt_multimeter_multitool.ino"
  "dino-tamagotchi|Dino-Tamagotchi-main|Tamaguino_DINO.ino"
  "tamagotchi|My_arduino_tamagotchi-main|Code.ino"
  "gyro-racer|GyroRacer-main/src/GyroRacer|GyroRacer.ino"
)

if [[ ! -x "$PIO_BIN" ]]; then
  echo "PlatformIO was not found at $PIO_BIN"
  echo "Set PIO_BIN=/path/to/pio and run again."
  exit 1
fi

build_one() {
  local id="$1"
  local sketch_dir="$2"
  local main_ino="$3"
  local src_dir="$ROOT_DIR/$sketch_dir"
  local build_dir
  build_dir="$(mktemp -d "${TMPDIR:-/tmp}/breadbox-${id}.XXXXXX")"

  echo "Building $id"
  mkdir -p "$build_dir/src"
  cp "$src_dir"/* "$build_dir/src/"

  cat > "$build_dir/platformio.ini" <<'INI'
[env:uno]
platform = atmelavr
board = uno
framework = arduino
lib_deps =
  adafruit/Adafruit GFX Library
  adafruit/Adafruit SSD1306
  jrowberg/I2Cdevlib-MPU6050
  gypsyrobot/CuteBuzzerSounds
build_flags =
  -D SSD1306_NO_SPLASH
INI

  if [[ -f "$build_dir/src/$main_ino" ]]; then
    mv "$build_dir/src/$main_ino" "$build_dir/src/main.ino"
  fi

  if [[ "$id" == "mini-pc" ]]; then
    local patched="$build_dir/src/main.ino.patched"
    {
      sed -n '1,18p' "$build_dir/src/main.ino"
      cat <<'PROTOTYPES'
void checkButtonsMenu();
void drawMenu();
void checkButtonsCalc();
void drawCalc();
void checkButtonsStop();
void drawStop();
void checkColision();
void checkButtonsGame();
void drawGame();
void calendarDraw();
void checkButtonsCalendar();
void phoneDraw();
void GameReset();
void resetAll();
PROTOTYPES
      sed -n '19,$p' "$build_dir/src/main.ino"
    } > "$patched"
    mv "$patched" "$build_dir/src/main.ino"
  fi

  (cd "$build_dir" && "$PIO_BIN" run)
  cp "$build_dir/.pio/build/uno/firmware.hex" "$OUT_DIR/$id.hex"
  rm -rf "$build_dir"
}

if [[ "${1:-}" != "" ]]; then
  found=0
  for project in "${PROJECTS[@]}"; do
    IFS="|" read -r id sketch_dir main_ino <<< "$project"
    if [[ "$id" == "$1" ]]; then
      build_one "$id" "$sketch_dir" "$main_ino"
      found=1
      break
    fi
  done
  if [[ "$found" == "0" ]]; then
    echo "Unknown sketch id: $1"
    exit 1
  fi
else
  for project in "${PROJECTS[@]}"; do
    IFS="|" read -r id sketch_dir main_ino <<< "$project"
    build_one "$id" "$sketch_dir" "$main_ino"
  done
fi

echo "Firmware written to $OUT_DIR"

const MANIFEST_URL = "firmware/manifest.json";
const PAGE_SIZE = 128;

const els = {
  browserStatus: document.querySelector("#browser-status"),
  sketchCount: document.querySelector("#sketch-count"),
  sketchList: document.querySelector("#sketch-list"),
  selectedName: document.querySelector("#selected-name"),
  selectedDetail: document.querySelector("#selected-detail"),
  selectedScreen: document.querySelector("#selected-screen"),
  uploadButton: document.querySelector("#upload-button"),
  refreshButton: document.querySelector("#refresh-button"),
  hexFile: document.querySelector("#hex-file"),
  progressFill: document.querySelector("#progress-fill"),
  progressLabel: document.querySelector("#progress-label"),
  progressPercent: document.querySelector("#progress-percent"),
  uploadButtonLabel: document.querySelector("#upload-button-label"),
  log: document.querySelector("#log"),
};

let sketches = [];
let selectedSketch = null;
let customHex = null;
let isUploading = false;

init();

async function init() {
  updateBrowserStatus();
  els.refreshButton.addEventListener("click", loadManifest);
  els.uploadButton.addEventListener("click", uploadSelected);
  els.hexFile.addEventListener("change", loadCustomHex);
  await loadManifest();
}

function updateBrowserStatus() {
  if (!("serial" in navigator)) {
    els.browserStatus.textContent = "Web Serial unavailable";
    els.browserStatus.classList.add("blocked");
    writeLog("Use Chrome or Edge from HTTPS or localhost.");
    return;
  }

  els.browserStatus.textContent = "Web Serial ready";
  els.browserStatus.classList.add("ready");
}

async function loadManifest() {
  setProgress(0, "Loading firmware list");
  try {
    const previousId = customHex ? null : selectedSketch?.id;
    const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Manifest request failed: ${response.status}`);
    }
    const manifest = await response.json();
    sketches = manifest.sketches || [];
    selectedSketch = sketches.find((sketch) => sketch.id === previousId) || sketches[0] || null;
    customHex = null;
    renderSketches();
    renderSelected();
    writeLog(`Loaded ${sketches.length} BREADBOX projects.`);
    setProgress(0, "Idle");
  } catch (error) {
    sketches = [];
    selectedSketch = null;
    renderSketches();
    renderSelected();
    setProgress(0, "Manifest error");
    writeLog(error.message);
  }
}

function renderSketches() {
  els.sketchList.textContent = "";
  els.sketchCount.textContent = `${sketches.length} sketch${sketches.length === 1 ? "" : "es"}`;

  if (!sketches.length) {
    const empty = document.createElement("p");
    empty.textContent = "No sketches found.";
    empty.className = "empty";
    els.sketchList.append(empty);
    return;
  }

  for (const sketch of sketches) {
    const button = document.createElement("button");
    button.className = "sketch-button";
    button.type = "button";
    button.dataset.id = sketch.id;
    button.classList.toggle("active", sketch === selectedSketch);
    const copy = document.createElement("span");
    copy.className = "sketch-copy";
    copy.innerHTML = `<strong></strong><span></span>`;
    copy.querySelector("strong").textContent = sketch.name;
    copy.querySelector("span").textContent = sketch.summary || sketch.hex;
    button.append(copy, createOledPreview(sketch.screen, "small"));
    button.addEventListener("click", () => {
      selectedSketch = sketch;
      customHex = null;
      els.hexFile.value = "";
      renderSketches();
      renderSelected();
      setProgress(0, "Idle");
    });
    els.sketchList.append(button);
  }
}

function renderSelected() {
  if (customHex) {
    els.selectedName.textContent = customHex.name;
    els.selectedDetail.textContent = "Custom Intel HEX file";
    renderSelectedScreen({
      title: "CUSTOM HEX",
      subtitle: "Ready to upload",
      mode: "custom",
    });
    els.uploadButton.disabled = isUploading || !("serial" in navigator);
    return;
  }

  if (!selectedSketch) {
    els.selectedName.textContent = "No sketch selected";
    els.selectedDetail.textContent = "Choose a BREADBOX sketch.";
    els.selectedScreen.textContent = "";
    els.uploadButton.disabled = true;
    return;
  }

  els.selectedName.textContent = selectedSketch.name;
  els.selectedDetail.textContent = selectedSketch.hardware || "Arduino UNO";
  renderSelectedScreen(selectedSketch.screen);
  els.uploadButton.disabled = isUploading || !("serial" in navigator);
}

function renderSelectedScreen(screen) {
  els.selectedScreen.textContent = "";
  els.selectedScreen.append(createOledPreview(screen, "large"));
}

function createOledPreview(screen = {}, size = "small") {
  const title = screen.title || "BREADBOX";
  const subtitle = screen.subtitle || "Loading...";
  const mode = screen.mode || "default";
  const orientation = screen.orientation || "landscape";
  const imageWidth = screen.width || (orientation === "portrait" ? 64 : 128);
  const imageHeight = screen.height || (orientation === "portrait" ? 128 : 64);
  const preview = document.createElement("span");
  preview.className = `oled-preview oled-preview--${size} oled-preview--${mode} oled-preview--${orientation}`;
  preview.setAttribute("aria-label", `OLED loading screen: ${title}, ${subtitle}`);

  const glass = document.createElement("span");
  glass.className = "oled-glass";

  if (screen.image) {
    const image = document.createElement("img");
    image.className = "oled-image";
    image.src = screen.image;
    image.alt = `${title} OLED boot screen`;
    image.width = imageWidth;
    image.height = imageHeight;
    glass.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "oled-fallback";
    fallback.innerHTML = `<span></span><span></span><span></span>`;
    fallback.querySelector("span:nth-child(1)").textContent = title;
    fallback.querySelector("span:nth-child(2)").textContent = subtitle;
    fallback.querySelector("span:nth-child(3)").textContent = "READY";
    glass.append(fallback);
  }

  preview.append(glass);
  return preview;
}

async function loadCustomHex(event) {
  const file = event.target.files?.[0];
  if (!file) {
    customHex = null;
    renderSelected();
    return;
  }

  customHex = {
    name: file.name,
    text: await file.text(),
  };
  renderSelected();
  writeLog(`Custom HEX loaded: ${file.name}`);
}

async function uploadSelected() {
  if (isUploading) {
    return;
  }

  if (!("serial" in navigator)) {
    writeLog("Web Serial is not available in this browser.");
    return;
  }

  setUploading(true);

  try {
    const hexText = customHex?.text || await fetchFirmware(selectedSketch);
    const firmware = parseIntelHex(hexText);
    writeLog(`Firmware size: ${firmware.length.toLocaleString()} bytes.`);
    setProgress(0, "Waiting for board");

    const port = await navigator.serial.requestPort();

    const uploader = new UnoUploader(port, (progress) => {
      setProgress(progress.percent, progress.label);
    });

    await uploader.upload(firmware);
    setProgress(100, "Upload complete");
    writeLog("Upload complete. Your Arduino UNO is running the selected project.");
  } catch (error) {
    setProgress(0, "Upload stopped");
    writeLog(error.message);
  } finally {
    setUploading(false);
    renderSelected();
  }
}

function setUploading(uploading) {
  isUploading = uploading;
  document.body.classList.toggle("is-uploading", uploading);
  els.uploadButton.disabled = uploading || !("serial" in navigator);
  els.uploadButton.setAttribute("aria-busy", String(uploading));
  els.uploadButtonLabel.textContent = uploading ? "Uploading" : "Upload to UNO";
}

async function fetchFirmware(sketch) {
  if (!sketch) {
    throw new Error("No sketch selected.");
  }

  const response = await fetch(`${sketch.hex}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Missing firmware file: ${sketch.hex}`);
  }

  return response.text();
}

function setProgress(percent, label) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  els.progressFill.style.width = `${clamped}%`;
  els.progressLabel.textContent = label;
  els.progressPercent.textContent = `${clamped}%`;
}

function writeLog(message) {
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  els.log.textContent += `[${stamp}] ${message}\n`;
  els.log.scrollTop = els.log.scrollHeight;
}

function parseIntelHex(text) {
  const bytes = new Map();
  let upperAddress = 0;
  let maxAddress = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.startsWith(":")) {
      throw new Error("Invalid Intel HEX line.");
    }

    const record = hexToBytes(line.slice(1));
    const length = record[0];
    const address = (record[1] << 8) | record[2];
    const type = record[3];
    const data = record.slice(4, 4 + length);
    const checksum = record[4 + length];
    const sum = record.slice(0, 4 + length).reduce((total, byte) => total + byte, checksum) & 0xff;

    if (sum !== 0) {
      throw new Error("Intel HEX checksum failed.");
    }

    if (type === 0x00) {
      const base = upperAddress + address;
      data.forEach((byte, index) => {
        const absolute = base + index;
        bytes.set(absolute, byte);
        maxAddress = Math.max(maxAddress, absolute);
      });
    } else if (type === 0x01) {
      break;
    } else if (type === 0x04) {
      upperAddress = ((data[0] << 8) | data[1]) << 16;
    }
  }

  if (!bytes.size) {
    throw new Error("No firmware data found in hex file.");
  }

  const firmware = new Uint8Array(maxAddress + 1).fill(0xff);
  for (const [address, byte] of bytes.entries()) {
    firmware[address] = byte;
  }
  return firmware;
}

function hexToBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid Intel HEX byte count.");
  }
  const out = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(Number.parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

class UnoUploader {
  constructor(port, onProgress) {
    this.port = port;
    this.onProgress = onProgress;
    this.reader = null;
    this.writer = null;
    this.rxBuffer = [];
  }

  async upload(firmware) {
    await this.port.open({ baudRate: 115200, bufferSize: 4096 });
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();

    try {
      await this.resetBoard();
      await this.sync();
      await this.program(firmware);
      await this.command([0x51, 0x20], 2);
    } finally {
      await this.close();
    }
  }

  async resetBoard() {
    this.onProgress({ percent: 2, label: "Resetting board" });
    await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await delay(250);
    await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await delay(350);
  }

  async sync() {
    this.onProgress({ percent: 4, label: "Opening bootloader" });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await this.command([0x30, 0x20], 2, 250);
        return;
      } catch {
        await delay(100);
      }
    }

    throw new Error("Could not sync with the UNO bootloader.");
  }

  async program(firmware) {
    const pages = Math.ceil(firmware.length / PAGE_SIZE);

    for (let page = 0; page < pages; page += 1) {
      const byteAddress = page * PAGE_SIZE;
      const chunk = firmware.slice(byteAddress, byteAddress + PAGE_SIZE);
      const wordAddress = byteAddress >> 1;
      await this.command([0x55, wordAddress & 0xff, (wordAddress >> 8) & 0xff, 0x20], 2);
      await this.command([0x64, 0x00, chunk.length, 0x46, ...chunk, 0x20], 2, 1000);

      const percent = 5 + ((page + 1) / pages) * 94;
      this.onProgress({ percent, label: `Writing page ${page + 1} of ${pages}` });
    }
  }

  async command(bytes, expectedLength, timeout = 500) {
    await this.writer.write(new Uint8Array(bytes));
    const response = await this.readBytes(expectedLength, timeout);
    if (response[0] !== 0x14 || response[response.length - 1] !== 0x10) {
      throw new Error(`Bootloader rejected command: ${bytes[0].toString(16)}`);
    }
    return response;
  }

  async readBytes(length, timeout) {
    const deadline = Date.now() + timeout;
    const out = this.rxBuffer.splice(0, length);

    while (out.length < length) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error("Timed out waiting for the bootloader.");
      }

      const result = await Promise.race([
        this.reader.read(),
        delay(remaining).then(() => ({ timeout: true })),
      ]);

      if (result.timeout) {
        throw new Error("Timed out waiting for the bootloader.");
      }
      if (result.done) {
        throw new Error("Serial connection closed.");
      }

      out.push(...result.value);
    }

    if (out.length > length) {
      this.rxBuffer.unshift(...out.slice(length));
    }

    return out.slice(0, length);
  }

  async close() {
    try {
      this.reader?.releaseLock();
      this.writer?.releaseLock();
    } finally {
      await this.port.close();
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

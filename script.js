const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

let tool = "brush";
const brushColor = "#000080"; // dark blue
const fillColor = "#4040A0";  // lighter dark blue
const eraserColor = [0, 0, 0, 0]; // transparent

let totalFrames = 10;
let currentFrame = 0;
let frames = [];
let playing = false;
let playInterval;

const brushBtn = document.getElementById("brushBtn");
const fillBtn = document.getElementById("fillBtn");
const eraserBtn = document.getElementById("eraserBtn");
const newProjectBtn = document.getElementById("newProjectBtn");
const exportGifBtn = document.getElementById("exportGifBtn");
const exportMp4Btn = document.getElementById("exportMp4Btn");
const exportDgmBtn = document.getElementById("exportDgmBtn");
const importDgmBtn = document.getElementById("importDgmBtn");
const importDgmInput = document.getElementById("importDgmInput");
const framesContainer = document.getElementById("framesContainer");
const playBtn = document.getElementById("playBtn");
const fpsInput = document.getElementById("fpsInput");

// Initialize frames array
function initFrames() {
  frames = [];
  for (let i = 0; i < totalFrames; i++) {
    frames.push(ctx.createImageData(width, height));
  }
}
initFrames();

// Create frame buttons dynamically
function createFrameButtons() {
  framesContainer.innerHTML = "";
  for (let i = 0; i < totalFrames; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Frame ${i + 1}`;
    btn.style.marginRight = "5px";
    btn.onclick = () => switchFrame(i);
    framesContainer.appendChild(btn);
  }
}
createFrameButtons();

function loadFrame(frameIndex) {
  currentFrame = frameIndex;
  ctx.putImageData(frames[frameIndex], 0, 0);
}

function saveFrame() {
  frames[currentFrame] = ctx.getImageData(0, 0, width, height);
}

function switchFrame(frameIndex) {
  saveFrame();
  loadFrame(frameIndex);
  if (playing) stopAnimation();
}

// Convert hex color to [r,g,b,a]
function hexToRGBA(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b, 255];
}

// Draw or fill according to current tool
function drawOrFill(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  if (tool === "brush") {
    drawPixel(x, y, hexToRGBA(brushColor));
  } else if (tool === "fill") {
    floodFillDotPattern(x, y, hexToRGBA(fillColor));
  } else if (tool === "eraser") {
    erasePixel(x, y);
  }
}

function drawPixel(x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const idx = (y * width + x) * 4;
  for (let i = 0; i < 4; i++) {
    imageData.data[idx + i] = rgba[i];
  }
  ctx.putImageData(imageData, 0, 0);
}

function erasePixel(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const idx = (y * width + x) * 4;
  imageData.data[idx] = 0;
  imageData.data[idx + 1] = 0;
  imageData.data[idx + 2] = 0;
  imageData.data[idx + 3] = 0;
  ctx.putImageData(imageData, 0, 0);
}

function floodFillDotPattern(x, y, fillRGBA) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const idx = (y * width + x) * 4;
  const targetColor = data.slice(idx, idx + 4);

  // Compare function
  function matchColor(pos) {
    for (let i = 0; i < 4; i++) {
      if (data[pos + i] !== targetColor[i]) return false;
    }
    return true;
  }

  // If target is already fill color, no need
  if (
    targetColor[0] === fillRGBA[0] &&
    targetColor[1] === fillRGBA[1] &&
    targetColor[2] === fillRGBA[2] &&
    targetColor[3] === fillRGBA[3]
  ) {
    return;
  }

  const stack = [[x, y]];
  const visited = new Set();

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const key = cx + "," + cy;
    if (visited.has(key)) continue;
    visited.add(key);

    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;

    const pos = (cy * width + cx) * 4;
    if (!matchColor(pos)) continue;

    // Dot pattern fill:
    if ((cx + cy) % 2 === 0) {
      for (let i = 0; i < 4; i++) {
        data[pos + i] = fillRGBA[i];
      }
    }

    stack.push([cx + 1, cy]);
    stack.push([cx - 1, cy]);
    stack.push([cx, cy + 1]);
    stack.push([cx, cy - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

// Event listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  drawOrFill(e);
  canvas.addEventListener("mousemove", drawOrFill);
});

canvas.addEventListener("mouseup", () => {
  canvas.removeEventListener("mousemove", drawOrFill);
  saveFrame();
});

canvas.addEventListener("mouseleave", () => {
  canvas.removeEventListener("mousemove", drawOrFill);
  saveFrame();
});

// Tool buttons
brushBtn.onclick = () => (tool = "brush");
fillBtn.onclick = () => (tool = "fill");
eraserBtn.onclick = () => (tool = "eraser");

// New Project button
newProjectBtn.onclick = () => {
  if (confirm("Start a new project? Unsaved work will be lost.")) {
    initFrames();
    loadFrame(0);
    if (playing) stopAnimation();
  }
};

// Play / Stop animation
playBtn.onclick = () => {
  if (playing) {
    stopAnimation();
  } else {
    startAnimation();
  }
};

function startAnimation() {
  playing = true;
  playBtn.textContent = "Stop Animation";
  let frameIdx = 0;
  const fps = clampFPS(parseInt(fpsInput.value, 10));
  playInterval = setInterval(() => {
    ctx.putImageData(frames[frameIdx], 0, 0);
    frameIdx++;
    if (frameIdx >= totalFrames) frameIdx = 0;
  }, 1000 / fps);
}

function stopAnimation() {
  playing = false;
  playBtn.textContent = "Play Animation";
  clearInterval(playInterval);
  loadFrame(currentFrame);
}

function clampFPS(fps) {
  if (isNaN(fps) || fps < 1) return 1;
  if (fps > 15) return 15;
  return fps;
}

// Export GIF
exportGifBtn.onclick = () => {
  alert("Exporting GIF... This might take a few seconds.");
  const fps = clampFPS(parseInt(fpsInput.value, 10));
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js",
  });

  for (const frame of frames) {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    offCtx.putImageData(frame, 0, 0);
    gif.addFrame(offCtx, { delay: 1000 / fps });
  }

  gif.on("finished", function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "digimation.gif";
    a.click();
    URL.revokeObjectURL(url);
  });

  gif.render();
};

// Export MP4
exportMp4Btn.onclick = () => {
  alert("Exporting MP4... This might take a few seconds.");
  const fps = clampFPS(parseInt(fpsInput.value, 10));
  const whammy = new Whammy.Video(fps);

  for (const frame of frames) {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    offCtx.putImageData(frame, 0, 0);
    whammy.add(offscreen);
  }

  whammy.compile(false).then((output) => {
    const url = URL.createObjectURL(output);
    const a = document.createElement("a");
    a.href = url;
    a.download = "digimation.mp4";
    a.click();
    URL.revokeObjectURL(url);
  });
};

// Export .dgm (custom binary format)
exportDgmBtn.onclick = () => {
  const headerSize = 6;
  const frameSize = width * height * 4;
  const buffer = new ArrayBuffer(headerSize + frameSize * totalFrames);
  const view = new DataView(buffer);

  // Write header
  view.setUint16(0, width, true);
  view.setUint16(2, height, true);
  view.setUint16(4, totalFrames, true);

  // Write frames pixel data
  let offset = headerSize;
  for (let f = 0; f < totalFrames; f++) {
    const frameData = frames[f].data;
    for (let i = 0; i < frameData.length; i++) {
      view.setUint8(offset + i, frameData[i]);
    }
    offset += frameData.length;
  }

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digimation.dgm";
  a.click();
  URL.revokeObjectURL(url);
};

// Import .dgm file
importDgmBtn.onclick = () => importDgmInput.click();

importDgmInput.addEventListener("change", () => {
  const file = importDgmInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const buffer = e.target.result;
    const view = new DataView(buffer);

    const w = view.getUint16(0, true);
    const h = view.getUint16(2, true);
    const framesCount = view.getUint16(4, true);

    if (w !== width || h !== height) {
      alert("File dimensions do not match current project.");
      return;
    }

    // Update totalFrames and recreate frame buttons if needed
    if (framesCount !== totalFrames) {
      totalFrames = framesCount;
      createFrameButtons();
      initFrames();
    }

    let offset = 6;
    for (let f = 0; f < totalFrames; f++) {
      const frameData = new Uint8ClampedArray(buffer, offset, width * height * 4);
      const imgData = new ImageData(frameData, width, height);
      frames[f] = imgData;
      offset += width * height * 4;
    }

    loadFrame(0);
    if (playing) stopAnimation();
  };

  reader.readAsArrayBuffer(file);
});

// Load initial frame on page load
loadFrame(0);

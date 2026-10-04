const TOTAL_FRAMES = 240;
const FOLDER_NAME = 'ezgif-76f9ad6e902b545c-jpg';
const LERP_FACTOR = 0.08;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const images = new Array(TOTAL_FRAMES);
const isLoaded = new Array(TOTAL_FRAMES).fill(false);

let currentProgress = 0;
let targetProgress = 0;
let lastRenderedFrame = -1;

function getFrameUrl(index) {
  const frameNumber = String(index + 1).padStart(3, '0');
  return `${FOLDER_NAME}/ezgif-frame-${frameNumber}.jpg`;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = window.innerWidth;
  const displayHeight = window.innerHeight;

  if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
  }

  if (lastRenderedFrame >= 0) {
    renderFrame(lastRenderedFrame);
  }
}

function drawImageCover(img) {
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  if (!iw || !ih) return;

  const ratio = Math.max(cw / iw, ch / ih);
  const nw = iw * ratio;
  const nh = ih * ratio;
  const cx = (cw - nw) * 0.5;
  const cy = (ch - nh) * 0.5;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
}

function findNearestLoadedFrame(targetIndex) {
  if (isLoaded[targetIndex]) return targetIndex;

  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = targetIndex - offset;
    if (prev >= 0 && isLoaded[prev]) return prev;
    const next = targetIndex + offset;
    if (next < TOTAL_FRAMES && isLoaded[next]) return next;
  }
  return -1;
}

function renderFrame(index) {
  const frameToDraw = findNearestLoadedFrame(index);
  if (frameToDraw === -1) return;

  const img = images[frameToDraw];
  if (!img) return;

  drawImageCover(img);
  lastRenderedFrame = frameToDraw;
}

function onScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  targetProgress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
}

function animationLoop() {
  // Smooth linear interpolation for inertia
  const diff = targetProgress - currentProgress;
  if (Math.abs(diff) > 0.00005) {
    currentProgress += diff * LERP_FACTOR;
  } else {
    currentProgress = targetProgress;
  }

  const frameIndex = Math.min(
    TOTAL_FRAMES - 1,
    Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
  );

  if (frameIndex !== lastRenderedFrame) {
    renderFrame(frameIndex);
  }

  requestAnimationFrame(animationLoop);
}

// Preload first frame immediately for instant first paint
function preloadImages() {
  const firstImg = new Image();
  firstImg.src = getFrameUrl(0);
  images[0] = firstImg;

  firstImg.onload = () => {
    isLoaded[0] = true;
    renderFrame(0);
  };

  // Preload remaining frames
  for (let i = 1; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFrameUrl(i);
    images[i] = img;

    if (img.decode) {
      img.decode()
        .then(() => {
          isLoaded[i] = true;
          // If user scrolled to this frame while it was decoding, render it
          const currentTarget = Math.round(currentProgress * (TOTAL_FRAMES - 1));
          if (currentTarget === i) {
            renderFrame(i);
          }
        })
        .catch(() => {
          // Fallback if decode rejects
          img.onload = () => {
            isLoaded[i] = true;
          };
        });
    } else {
      img.onload = () => {
        isLoaded[i] = true;
      };
    }
  }
}

// Direct interaction handlers (Drag to scrub, Wheel, Keyboard)
let isDragging = false;
let startY = 0;
let startScroll = 0;

window.addEventListener('pointerdown', (e) => {
  // Only trigger on primary mouse button or touch
  if (e.button !== 0) return;
  isDragging = true;
  startY = e.clientY;
  startScroll = window.scrollY;
  document.body.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const deltaY = startY - e.clientY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll > 0) {
    const targetY = Math.max(0, Math.min(maxScroll, startScroll + deltaY * 2.5));
    window.scrollTo(0, targetY);
    onScroll();
  }
});

const endDrag = () => {
  if (isDragging) {
    isDragging = false;
    document.body.style.cursor = 'default';
  }
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (e) => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const step = window.innerHeight * 0.35;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    window.scrollBy({ top: step, behavior: 'smooth' });
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    window.scrollBy({ top: -step, behavior: 'smooth' });
  } else if (e.key === 'Home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (e.key === 'End') {
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
  }
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('wheel', onScroll, { passive: true });

// Initialize
resizeCanvas();
onScroll();
currentProgress = targetProgress;
preloadImages();
requestAnimationFrame(animationLoop);

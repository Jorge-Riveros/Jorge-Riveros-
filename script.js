const canvas = document.querySelector("#filament-canvas");
const ctx = canvas.getContext("2d");
document.documentElement.classList.add("has-scroll-reveal");

const lightbox = document.querySelector("#lightbox");
const lightboxViewport = document.querySelector("#lightbox-viewport");
const lightboxImage = document.querySelector("#lightbox-image");
const labelTitle = document.querySelector("#label-title");
const labelMedium = document.querySelector("#label-medium");
const labelDimensions = document.querySelector("#label-dimensions");
const labelYear = document.querySelector("#label-year");
const closeButton = document.querySelector(".lightbox-close");
const previousArtworkButton = document.querySelector(".lightbox-prev");
const nextArtworkButton = document.querySelector(".lightbox-next");
const zoomControls = document.querySelectorAll(".zoom-control");
const workCards = document.querySelectorAll(".work-card");
const workImages = document.querySelectorAll(".work-card img");
const revealSections = document.querySelectorAll(".text-section, .cv-section, .contact-section");
const exhibitionList = document.querySelector("#exhibition-list");
const cvToggle = document.querySelector(".cv-toggle");

let width = 0;
let height = 0;
let filaments = [];
let clusters = [];
let animationFrame = null;
let lastFrameTime = 0;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDraggingArtwork = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let activeDragPointerId = null;
let currentArtworkIndex = 0;
const filamentTones = [
  [255, 118, 128],
  [255, 144, 172],
  [238, 116, 206],
  [186, 118, 255],
  [132, 150, 255],
  [92, 184, 255],
  [72, 220, 214],
  [112, 232, 150],
  [196, 236, 92],
  [255, 196, 78],
  [255, 232, 178],
  [236, 240, 246],
];
const artworkDetails = {
  "Bodylight": {
    title: "Body of Light",
    medium: "Oil on Canvas",
    dimensions: "150 × 100 cm",
    year: "2023",
  },
  "Double Gaze": {
    title: "Double Gaze",
    medium: "Oil on Canvas",
    dimensions: "150 × 100 cm",
    year: "2023",
  },
  "Observable Universe": {
    title: "Observable Universe",
    medium: "Oil on Canvas",
    dimensions: "150 × 50 cm",
    year: "2024",
  },
  "Origin": {
    title: "Origin",
    medium: "Oil on Canvas",
    dimensions: "180 × 140 cm",
    year: "2024",
  },
  "Warm Rain": {
    title: "Warm Rain",
    medium: "Oil on Canvas",
    dimensions: "100 × 100 cm",
    year: "2025",
  },
  "Seed": {
    title: "Seed",
    medium: "Oil on Canvas",
    dimensions: "150 × 100 cm",
    year: "2024",
  },
};

function resolveAssetPath(path) {
  if (window.location.protocol === "file:" && path.startsWith("/")) {
    return `.${path}`;
  }

  return path;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getContainedImageSize() {
  const viewportWidth = lightboxViewport.clientWidth;
  const viewportHeight = lightboxViewport.clientHeight;
  const naturalWidth = lightboxImage.naturalWidth || viewportWidth;
  const naturalHeight = lightboxImage.naturalHeight || viewportHeight;
  const scale = Math.min(viewportWidth / naturalWidth, viewportHeight / naturalHeight);

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

function applyZoom() {
  if (!lightboxImage || !lightboxViewport) {
    return;
  }

  const containedImage = getContainedImageSize();
  const imageWidth = containedImage.width;
  const imageHeight = containedImage.height;
  const maxPanX = Math.max(0, ((imageWidth * zoomLevel) - lightboxViewport.clientWidth) / 2);
  const maxPanY = Math.max(0, ((imageHeight * zoomLevel) - lightboxViewport.clientHeight) / 2);
  panX = clamp(panX, -maxPanX, maxPanX);
  panY = clamp(panY, -maxPanY, maxPanY);

  lightboxImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoomLevel})`;
  lightboxViewport.classList.toggle("is-zoomed", zoomLevel > 1.01);
}

function setZoom(nextZoom) {
  const previousZoom = zoomLevel;
  zoomLevel = clamp(nextZoom, 1, 4);

  if (zoomLevel === 1 || previousZoom === 1) {
    panX = 0;
    panY = 0;
  }

  applyZoom();
}

function resetZoom() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  applyZoom();
}

function resetZoomAfterLayout() {
  requestAnimationFrame(() => {
    requestAnimationFrame(resetZoom);
  });
}

function changeZoom(direction) {
  if (direction === "reset") {
    resetZoom();
    return;
  }

  const step = direction === "in" ? 0.35 : -0.35;
  setZoom(zoomLevel + step);
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  createFilaments();
}

function createFilaments() {
  createClusters();

  const density = width < 620 ? 0.42 : 0.62;
  const count = Math.min(width < 620 ? 260 : 540, Math.max(210, Math.floor(width * density)));

  filaments = Array.from({ length: count }, () => {
    const filament = createFilament();
    filament.y = Math.random() * (height + filament.length) - filament.length;
    return filament;
  });
}

function createClusters() {
  const count = width < 620 ? 5 : 9;

  clusters = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    width: width * (0.055 + Math.random() * 0.13),
    strength: 0.35 + Math.random() * 0.7,
  }));
}

function randomTopY(length) {
  return -length - Math.random() * height * 0.18;
}

function clusterX() {
  if (clusters.length && Math.random() > 0.62) {
    const cluster = clusters[Math.floor(Math.random() * clusters.length)];
    return cluster.x + (Math.random() - 0.5) * cluster.width * (0.8 + Math.random() * 1.9);
  }

  return Math.random() * width;
}

function createFilament(initialY) {
  const tone = filamentTones[Math.floor(Math.random() * filamentTones.length)];
  const clustered = Math.random() > 0.68;
  const longStrand = Math.random() > 0.82;
  const length = longStrand ? 96 + Math.random() * 120 : 34 + Math.random() * 92;
  const alpha = clustered ? 0.064 + Math.random() * 0.078 : 0.042 + Math.random() * 0.058;

  return {
    x: clusterX(),
    y: initialY ?? randomTopY(length),
    length,
    speed: 150 + Math.random() * 260,
    alpha,
    drift: 0.35 + Math.random() * 1.85,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.08 + Math.random() * 0.18,
    tone,
    width: 0.24 + Math.random() * (longStrand ? 0.68 : 0.44),
    blur: 1 + Math.random() * 3.5,
    glow: clustered ? 0.9 + Math.random() * 0.65 : 0.6 + Math.random() * 0.45,
  };
}

function drawFilaments(timestamp = 0) {
  const elapsed = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0.016;
  lastFrameTime = timestamp;

  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  for (const filament of filaments) {
    filament.y += filament.speed * elapsed;
    filament.phase += filament.phaseSpeed * elapsed;

    if (filament.y - filament.length > height) {
      Object.assign(filament, createFilament());
    }

    const x = filament.x + Math.sin(filament.phase + filament.y * 0.002) * filament.drift;
    const topY = filament.y - filament.length;
    const [red, green, blue] = filament.tone;
    const gradient = ctx.createLinearGradient(x, topY, x, filament.y);
    const pulse = 0.82 + Math.sin(filament.phase * 2.4) * 0.18;
    const alpha = filament.alpha * pulse;

    gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0)`);
    gradient.addColorStop(0.18, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.3})`);
    gradient.addColorStop(0.56, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
    gradient.addColorStop(0.9, `rgba(${red}, ${green}, ${blue}, ${alpha * 1.28})`);
    gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.16})`);

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = filament.width * filament.glow;
    ctx.lineCap = "round";
    ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${alpha * 1.65})`;
    ctx.shadowBlur = filament.blur;
    ctx.moveTo(x, topY);
    ctx.lineTo(x, filament.y);
    ctx.stroke();

    if (filament.width > 0.68) {
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = Math.max(0.22, filament.width * 0.42);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * 0.52})`;
      ctx.stroke();
    }

    ctx.restore();
  }

  animationFrame = requestAnimationFrame(drawFilaments);
}

function startFilaments() {
  resizeCanvas();
  lastFrameTime = 0;
  animationFrame = requestAnimationFrame(drawFilaments);
}

function openLightbox(card) {
  const title = card.dataset.title;
  const image = resolveAssetPath(card.dataset.image);
  const details = artworkDetails[title] || {
    title,
    medium: "Oil on Canvas",
    dimensions: "",
    year: "",
  };

  resetZoom();
  lightboxImage.onload = resetZoomAfterLayout;
  lightboxImage.src = image;
  lightboxImage.alt = `${details.title} by Jorge Riveros`;
  labelTitle.textContent = details.title;
  labelMedium.textContent = details.medium;
  labelDimensions.textContent = details.dimensions;
  labelYear.textContent = details.year;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resetZoomAfterLayout();
  closeButton.focus();
}

function openArtworkAt(index) {
  const normalizedIndex = (index + workCards.length) % workCards.length;
  currentArtworkIndex = normalizedIndex;
  openLightbox(workCards[normalizedIndex]);
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lightboxImage.onload = null;
  resetZoom();
}

workCards.forEach((card) => {
  card.addEventListener("click", () => {
    currentArtworkIndex = Array.from(workCards).indexOf(card);
    openLightbox(card);
  });
});

function activateWorkCard(card) {
  workCards.forEach((item) => {
    item.classList.toggle("is-active", item === card);
  });
  document.documentElement.classList.add("is-viewing-work");
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");

        if (entry.intersectionRatio > 0.42) {
          activateWorkCard(entry.target);
        }
      });
    },
    {
      threshold: [0.18, 0.42, 0.68],
      rootMargin: "-12% 0px -12% 0px",
    }
  );

  workCards.forEach((card) => revealObserver.observe(card));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible-section");
        }
      });
    },
    {
      threshold: 0.24,
      rootMargin: "-10% 0px -10% 0px",
    }
  );

  revealSections.forEach((section) => sectionObserver.observe(section));
} else {
  workCards.forEach((card) => card.classList.add("is-visible"));
  revealSections.forEach((section) => section.classList.add("is-visible-section"));
}

workImages.forEach((image) => {
  const card = image.closest(".work-card");

  image.addEventListener("pointerenter", () => {
    card?.classList.add("is-artwork-hovered");
    card?.classList.add("is-title-revealed");
  });

  image.addEventListener("pointerleave", () => {
    card?.classList.remove("is-artwork-hovered");
    card?.classList.remove("is-title-revealed");
  });

  image.addEventListener(
    "error",
    () => {
      if (image.dataset.fallbackApplied) {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = resolveAssetPath(image.getAttribute("src"));
    },
    { once: true }
  );
});

closeButton.addEventListener("click", closeLightbox);

previousArtworkButton.addEventListener("click", () => {
  openArtworkAt(currentArtworkIndex - 1);
});

nextArtworkButton.addEventListener("click", () => {
  openArtworkAt(currentArtworkIndex + 1);
});

if (cvToggle && exhibitionList) {
  cvToggle.addEventListener("click", () => {
    const isExpanded = cvToggle.getAttribute("aria-expanded") === "true";
    cvToggle.setAttribute("aria-expanded", String(!isExpanded));
    exhibitionList.classList.toggle("is-collapsed", isExpanded);
    cvToggle.textContent = isExpanded
      ? "View full exhibition history"
      : "Show fewer exhibitions";
  });
}

zoomControls.forEach((control) => {
  control.addEventListener("click", () => {
    changeZoom(control.dataset.zoom);
  });
});

lightboxViewport.addEventListener("wheel", (event) => {
  if (!lightbox.classList.contains("is-open")) {
    return;
  }

  event.preventDefault();
  setZoom(zoomLevel + (event.deltaY < 0 ? 0.18 : -0.18));
}, { passive: false });

lightboxViewport.addEventListener("dblclick", () => {
  setZoom(zoomLevel > 1.01 ? 1 : 2.2);
});

lightboxViewport.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  if (zoomLevel <= 1.01) {
    setZoom(2.2);
  }

  isDraggingArtwork = true;
  activeDragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginX = panX;
  dragOriginY = panY;
  lightboxViewport.classList.add("is-dragging");
  lightboxViewport.setPointerCapture(event.pointerId);
});

lightboxViewport.addEventListener("pointermove", (event) => {
  if (!isDraggingArtwork || event.pointerId !== activeDragPointerId) {
    return;
  }

  event.preventDefault();
  panX = dragOriginX + event.clientX - dragStartX;
  panY = dragOriginY + event.clientY - dragStartY;
  applyZoom();
});

function endArtworkDrag(event) {
  if (!isDraggingArtwork) {
    return;
  }

  isDraggingArtwork = false;
  activeDragPointerId = null;
  lightboxViewport.classList.remove("is-dragging");

  if (event?.pointerId && lightboxViewport.hasPointerCapture(event.pointerId)) {
    lightboxViewport.releasePointerCapture(event.pointerId);
  }
}

lightboxViewport.addEventListener("pointerup", endArtworkDrag);
lightboxViewport.addEventListener("pointercancel", endArtworkDrag);
lightboxViewport.addEventListener("lostpointercapture", endArtworkDrag);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
    closeLightbox();
  }

  if (!lightbox.classList.contains("is-open")) {
    return;
  }

  if (event.key === "+" || event.key === "=") {
    changeZoom("in");
  }

  if (event.key === "-") {
    changeZoom("out");
  }

  if (event.key === "0") {
    resetZoom();
  }

  if (event.key === "ArrowLeft") {
    openArtworkAt(currentArtworkIndex - 1);
  }

  if (event.key === "ArrowRight") {
    openArtworkAt(currentArtworkIndex + 1);
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  applyZoom();
});

startFilaments();

/* ==========================================================
   Nelly's Game Hub, main script
   ========================================================== */

/* ---------- 1. Boot intro ---------- */
const bootIntro = document.getElementById("bootIntro");
const bootBeamFill = document.getElementById("bootBeamFill");
const bootSparks = document.getElementById("bootSparks");

// Make 28 floating sparks, each one gets its own random settings
for (let i = 0; i < 28; i++) {
  const spark = document.createElement("span");
  spark.className = "boot-spark";
  spark.style.setProperty("--x", Math.random() * 100 + "%");
  spark.style.setProperty("--size", (Math.random() * 3 + 2).toFixed(1) + "px");
  spark.style.setProperty("--duration", (Math.random() * 4 + 4).toFixed(1) + "s");
  spark.style.setProperty("--delay", (Math.random() * -6).toFixed(1) + "s");
  spark.style.setProperty("--sway", (Math.random() * 80 - 40).toFixed(0) + "px");
  bootSparks.appendChild(spark);
}

const minimumLoadTime = 2600;          // the intro always plays for at least this long
const loadStartedAt = Date.now();

let shownPercent = 0;
let pageHasFinishedLoading = false;

// The browser tells us when images, fonts and everything else are ready
window.addEventListener("load", function () {
  pageHasFinishedLoading = true;
});

const progressTimer = setInterval(function () {
  const timeSpent = Date.now() - loadStartedAt;
  const canGoToFull = pageHasFinishedLoading && timeSpent >= minimumLoadTime;

  // Climb to 90 on its own, only go past 90 once the page is truly ready
  const limit = canGoToFull ? 100 : 90;

  if (shownPercent < limit) {
    shownPercent = Math.min(limit, shownPercent + 1 + Math.floor(Math.random() * 3));
    bootBeamFill.style.width = shownPercent + "%";
  }

  if (shownPercent >= 100) {
    clearInterval(progressTimer);
    finishIntro();
  }
}, 55);

function finishIntro() {
  // Short pause on the full beam, then flash and fade out
  setTimeout(function () {
    bootIntro.classList.add("is-done");
    document.body.classList.remove("is-loading");

    // Give the first trophy once the page has settled in
    setTimeout(function () { unlockTrophy("welcome"); }, 1500);
  }, 450);

  // Once the fade is over, remove the intro completely
  setTimeout(function () {
    bootIntro.classList.add("is-gone");
  }, 1700);
}

/* ---------- 2. Shop details (edit these when real info is ready) ---------- */
const shopDetails = {
  phoneNumber: "09068466118",
  address: ""            // leave empty until we know the real address
};

// WhatsApp wants the international format: 234 instead of the 0 at the front
function toInternationalNumber(localNumber) {
  const digitsOnly = localNumber.replace(/\D/g, "");
  return digitsOnly.startsWith("0") ? "234" + digitsOnly.slice(1) : digitsOnly;
}

const whatsappNumber = toInternationalNumber(shopDetails.phoneNumber);

// Makes a link that opens WhatsApp with the message already typed
function buildWhatsAppLink(messageText) {
  return "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(messageText);
}

// Every element with data-whatsapp becomes a working WhatsApp link
document.querySelectorAll("[data-whatsapp]").forEach(function (element) {
  element.href = buildWhatsAppLink(element.dataset.whatsapp);
  element.target = "_blank";
  element.rel = "noopener";
});

/* ---------- 3. Mobile menu ---------- */
const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");

function setMenuOpen(shouldOpen) {
  mainNav.classList.toggle("is-open", shouldOpen);
  menuButton.setAttribute("aria-expanded", String(shouldOpen));
  menuButton.setAttribute("aria-label", shouldOpen ? "Close menu" : "Open menu");
}

menuButton.addEventListener("click", function () {
  setMenuOpen(!mainNav.classList.contains("is-open"));
});

// Close the menu after tapping a link
mainNav.querySelectorAll("a").forEach(function (link) {
  link.addEventListener("click", function () { setMenuOpen(false); });
});

/* ---------- 4. Starfield background (reacts to the pointer) ---------- */
const starCanvas = document.getElementById("starfield");
const starPen = starCanvas.getContext("2d");
const userWantsLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let starList = [];
let lastScreenWidth = window.innerWidth;

const pushRadius = 130;     // how close the pointer must be to push a star away
const linkDistance = 130;   // how close two stars must be to get a line between them
const pointer = { x: 0, y: 0, isActive: false };

function makeStars() {
  // Scale the canvas up on sharp screens so the stars are not blurry
  const pixelRatio = window.devicePixelRatio || 1;
  starCanvas.width = window.innerWidth * pixelRatio;
  starCanvas.height = window.innerHeight * pixelRatio;
  starPen.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // More stars on big screens, fewer on small ones, never more than 220
  const starCount = Math.min(220, Math.floor((window.innerWidth * window.innerHeight) / 6500));
  starList = [];

  for (let i = 0; i < starCount; i++) {
    starList.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.8 + 0.8,
      driftSpeed: Math.random() * 0.25 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
      isBlue: Math.random() < 0.25,
      pushX: 0,          // sideways shove from the pointer
      pushY: 0           // up or down shove from the pointer
    });
  }
}

function drawStars(timeNow) {
  starPen.clearRect(0, 0, window.innerWidth, window.innerHeight);
  starPen.globalAlpha = 1;

  // Soft glow that follows the pointer
  if (pointer.isActive && !userWantsLessMotion) {
    const haloSize = pushRadius * 1.2;
    const halo = starPen.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, haloSize);
    halo.addColorStop(0, "rgba(79, 216, 255, 0.14)");
    halo.addColorStop(1, "rgba(79, 216, 255, 0)");
    starPen.fillStyle = halo;
    starPen.fillRect(pointer.x - haloSize, pointer.y - haloSize, haloSize * 2, haloSize * 2);
  }

  const starsNearPointer = [];

  starList.forEach(function (star) {
    let closeness = 0;   // 0 = far from the pointer, 1 = right under it

    if (!userWantsLessMotion) {
      star.y += star.driftSpeed;

      if (pointer.isActive) {
        const gapX = star.x - pointer.x;
        const gapY = star.y - pointer.y;
        const gap = Math.sqrt(gapX * gapX + gapY * gapY);

        closeness = Math.max(0, 1 - gap / (pushRadius * 1.4));

        // Push the star directly away from the pointer, harder the closer it is
        if (gap < pushRadius && gap > 0) {
          const strength = (1 - gap / pushRadius) * 1.6;
          star.pushX += (gapX / gap) * strength;
          star.pushY += (gapY / gap) * strength;
        }
      }

      star.x += star.pushX;
      star.y += star.pushY;
      star.pushX *= 0.9;   // the shove fades out a little every frame
      star.pushY *= 0.9;

      // Keep stars on screen: wrap around the sides, restart at the top when they fall off
      if (star.x < -20) { star.x = window.innerWidth + 20; }
      if (star.x > window.innerWidth + 20) { star.x = -20; }
      if (star.y > window.innerHeight) {
        star.y = 0;
        star.x = Math.random() * window.innerWidth;
      }
    }

    // Brightness rises and falls like a sine wave, so each star twinkles
    const twinkle = 0.5 + 0.5 * Math.sin(timeNow / 600 + star.twinkleOffset);
    const drawSize = star.size * (1 + closeness * 1.2);

    starPen.globalAlpha = Math.min(1, 0.25 + twinkle * 0.75 + closeness * 0.5);
    starPen.fillStyle = star.isBlue ? "#4fd8ff" : "#ffffff";
    starPen.fillRect(star.x, star.y, drawSize, drawSize);

    if (closeness > 0) {
      starsNearPointer.push(star);
    }
  });

  // Draw thin lines between stars that are close to the pointer and close to each other
  starPen.lineWidth = 1;
  for (let a = 0; a < starsNearPointer.length; a++) {
    for (let b = a + 1; b < starsNearPointer.length; b++) {
      const first = starsNearPointer[a];
      const second = starsNearPointer[b];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);

      if (distance < linkDistance) {
        starPen.globalAlpha = (1 - distance / linkDistance) * 0.7;
        starPen.strokeStyle = "#4fd8ff";
        starPen.beginPath();
        starPen.moveTo(first.x, first.y);
        starPen.lineTo(second.x, second.y);
        starPen.stroke();
      }
    }
  }

  if (!userWantsLessMotion) {
    requestAnimationFrame(drawStars);
  }
}

makeStars();
requestAnimationFrame(drawStars);

// Rebuild the stars if the screen width changes (phones fire resize when the address bar hides)
window.addEventListener("resize", function () {
  if (window.innerWidth !== lastScreenWidth) {
    lastScreenWidth = window.innerWidth;
    makeStars();
  }
});

// Track the mouse or finger
window.addEventListener("pointermove", function (event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.isActive = true;
});
document.documentElement.addEventListener("mouseleave", function () {
  pointer.isActive = false;
});
["pointerup", "pointercancel"].forEach(function (eventName) {
  window.addEventListener(eventName, function (event) {
    if (event.pointerType === "touch") { pointer.isActive = false; }
  });
});

// Rebuild the stars if the screen width changes (phones fire resize when the address bar hides)
window.addEventListener("resize", function () {
  if (window.innerWidth !== lastScreenWidth) {
    lastScreenWidth = window.innerWidth;
    makeStars();
  }
});

/* ---------- 5. Flowing light waves ---------- */
const waveCanvas = document.getElementById("waveCanvas");
const wavePen = waveCanvas.getContext("2d");
const waveScale = 0.5;   // draw at half size: faster, and it softens the edges for free

// Each ribbon has its own height, size, speed and colour
const ribbonList = [
  { heightShare: 0.62, swing: 0.07, thickness: 0.18, speed: 0.00045, phase: 0,   color: "47, 107, 255" },
  { heightShare: 0.70, swing: 0.09, thickness: 0.13, speed: 0.00035, phase: 2,   color: "79, 216, 255" },
  { heightShare: 0.76, swing: 0.06, thickness: 0.16, speed: 0.00055, phase: 4,   color: "91, 141, 255" },
  { heightShare: 0.56, swing: 0.05, thickness: 0.10, speed: 0.00030, phase: 5.5, color: "47, 107, 255" }
];

function sizeWaveCanvas() {
  waveCanvas.width = Math.floor(window.innerWidth * waveScale);
  waveCanvas.height = Math.floor(window.innerHeight * waveScale);
}

function drawRibbon(ribbon, timeNow) {
  const width = waveCanvas.width;
  const height = waveCanvas.height;
  const motion = timeNow * ribbon.speed;
  const stepSize = 6;

  // Works out the height of the top edge of the ribbon at a spot across the screen
  function topEdge(across) {
    return height * ribbon.heightShare
      + Math.sin(across * Math.PI * 2 * 1.1 + motion + ribbon.phase) * height * ribbon.swing
      + Math.sin(across * Math.PI * 2 * 2.3 - motion * 1.3 + ribbon.phase * 2) * height * ribbon.swing * 0.45;
  }

  // The ribbon gets thick and thin along its length, like silk twisting
  function ribbonThickness(across) {
    const twist = 0.5 + 0.5 * Math.sin(across * Math.PI * 2 * 0.8 - motion * 0.8 + ribbon.phase);
    return height * ribbon.thickness * (0.2 + 0.8 * twist);
  }

  // Trace along the top edge, then back along the bottom edge, to outline the ribbon
  wavePen.beginPath();
  for (let x = 0; x <= width; x += stepSize) {
    const y = topEdge(x / width);
    if (x === 0) { wavePen.moveTo(x, y); } else { wavePen.lineTo(x, y); }
  }
  for (let x = width; x >= 0; x -= stepSize) {
    const across = x / width;
    wavePen.lineTo(x, topEdge(across) + ribbonThickness(across));
  }
  wavePen.closePath();

  // Colour fades out at the left and right edges of the screen
  const colourFade = wavePen.createLinearGradient(0, 0, width, 0);
  colourFade.addColorStop(0, "rgba(" + ribbon.color + ", 0)");
  colourFade.addColorStop(0.3, "rgba(" + ribbon.color + ", 0.18)");
  colourFade.addColorStop(0.7, "rgba(" + ribbon.color + ", 0.18)");
  colourFade.addColorStop(1, "rgba(" + ribbon.color + ", 0)");
  wavePen.fillStyle = colourFade;
  wavePen.fill();
}

function drawWaves(timeNow) {
  wavePen.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
  wavePen.globalCompositeOperation = "lighter";   // overlapping ribbons add up and glow brighter

  ribbonList.forEach(function (ribbon) {
    drawRibbon(ribbon, timeNow);
  });

  if (!userWantsLessMotion) {
    requestAnimationFrame(drawWaves);
  }
}

sizeWaveCanvas();
requestAnimationFrame(drawWaves);
window.addEventListener("resize", sizeWaveCanvas);
/* ---------- 6. Service menu (console style) ---------- */
const serviceMenu = document.getElementById("serviceMenu");
const serviceTiles = Array.from(serviceMenu.querySelectorAll(".service-tile"));
const deviceHasMouse = window.matchMedia("(hover: hover)").matches;

const visitedTiles = new Set();

// Marks one tile as the focused one (or none), and tells the menu if anything is focused
function focusTile(chosenTile) {
  serviceTiles.forEach(function (tile) {
    tile.classList.toggle("is-focused", tile === chosenTile);
  });
  serviceMenu.classList.toggle("is-browsing", Boolean(chosenTile));

  // Visit every tile at least once to earn a trophy
  if (chosenTile) {
    visitedTiles.add(chosenTile);
    if (visitedTiles.size === serviceTiles.length) {
      unlockTrophy("browsing");
    }
  }
}

serviceTiles.forEach(function (tile, position) {
  // Mouse or keyboard arriving on the tile (focusin also catches the link inside it)
  tile.addEventListener("focusin", function () { focusTile(tile); });

  // Arrow keys move between tiles, Enter opens the link inside
  tile.addEventListener("keydown", function (event) {
    const lastPosition = serviceTiles.length - 1;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      serviceTiles[position === lastPosition ? 0 : position + 1].focus();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      serviceTiles[position === 0 ? lastPosition : position - 1].focus();
    }
    if (event.key === "Enter" && event.target === tile) {
      tile.querySelector(".tile-action").click();
    }
  });

  if (deviceHasMouse) {
    tile.addEventListener("mouseenter", function () { focusTile(tile); });

    // Tilt toward the cursor, and move the spotlight with it
    tile.addEventListener("mousemove", function (event) {
      const box = tile.getBoundingClientRect();
      const across = (event.clientX - box.left) / box.width;    // 0 = left edge, 1 = right edge
      const down = (event.clientY - box.top) / box.height;      // 0 = top edge, 1 = bottom edge

      tile.style.setProperty("--tilt-y", (across - 0.5) * 10 + "deg");
      tile.style.setProperty("--tilt-x", (0.5 - down) * 10 + "deg");
      tile.style.setProperty("--glow-x", across * 100 + "%");
      tile.style.setProperty("--glow-y", down * 100 + "%");
    });

    tile.addEventListener("mouseleave", function () {
      tile.style.removeProperty("--tilt-x");
      tile.style.removeProperty("--tilt-y");
    });
  }
});

// Leaving the whole menu clears the focus
serviceMenu.addEventListener("mouseleave", function () { focusTile(null); });
serviceMenu.addEventListener("focusout", function (event) {
  if (!serviceMenu.contains(event.relatedTarget)) { focusTile(null); }
});

/* ---------- 7. Fade-in as sections scroll into view ---------- */
document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll(".reveal, .stagger-group");

if ("IntersectionObserver" in window) {
  const scrollWatcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        scrollWatcher.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealItems.forEach(function (item) { scrollWatcher.observe(item); });
} else {
  revealItems.forEach(function (item) { item.classList.add("is-visible"); });
}

/* ---------- 8. Trophy pop-ups ---------- */
const trophyArea = document.getElementById("trophyArea");

// Every trophy: how rare it is, its name, and a short line under it
const trophyList = {
  welcome:   { tier: "bronze", title: "Welcome, Player 1", note: "You found Nelly's Game Hub." },
  services:  { tier: "bronze", title: "Window Shopper",    note: "You checked out what we do." },
  browsing:  { tier: "silver", title: "Menu Master",       note: "You browsed every service." },
  contacted: { tier: "gold",   title: "Player 2 Joined",   note: "You started a chat with us." },
  repair:    { tier: "gold",   title: "Repair Requested",  note: "Hit send on WhatsApp to lock it in." },
  finale:    { tier: "silver", title: "Final Level",       note: "You made it to the bottom of the page." }
};

const trophyIconMarkup =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>' +
  '<path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>' +
  '<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>' +
  '<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

const unlockedTrophies = new Set();   // trophies already earned on this visit
const waitingTrophies = [];           // trophies lined up to be shown
let trophyIsShowing = false;

// Call this from anywhere with a trophy name, for example unlockTrophy("welcome")
function unlockTrophy(trophyId) {
  if (!trophyList[trophyId] || unlockedTrophies.has(trophyId)) { return; }

  unlockedTrophies.add(trophyId);
  waitingTrophies.push(trophyList[trophyId]);
  showNextTrophy();
}

function showNextTrophy() {
  if (trophyIsShowing || waitingTrophies.length === 0) { return; }

  trophyIsShowing = true;
  const trophy = waitingTrophies.shift();

  const card = document.createElement("div");
  card.className = "trophy";
  card.dataset.tier = trophy.tier;
  card.innerHTML =
    '<div class="trophy-icon">' + trophyIconMarkup + '</div>' +
    '<div class="trophy-text">' +
      '<p class="trophy-label">Trophy unlocked</p>' +
      '<p class="trophy-name"></p>' +
      '<p class="trophy-note"></p>' +
    '</div>';
  card.querySelector(".trophy-name").textContent = trophy.title;
  card.querySelector(".trophy-note").textContent = trophy.note;
  trophyArea.appendChild(card);

  // After 4.5 seconds slide it out, then remove it and show the next one in line
  setTimeout(function () { card.classList.add("is-leaving"); }, 4500);
  setTimeout(function () {
    card.remove();
    trophyIsShowing = false;
    showNextTrophy();
  }, 5100);
}

/* Trophy triggers */

// 1. Scrolling down to the services section
const servicesSection = document.getElementById("services");
if ("IntersectionObserver" in window) {
  const servicesWatcher = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      unlockTrophy("services");
      servicesWatcher.disconnect();
    }
  }, { threshold: 0.4 });
  servicesWatcher.observe(servicesSection);
}

// 2. Clicking any WhatsApp button
document.querySelectorAll("[data-whatsapp]").forEach(function (button) {
  button.addEventListener("click", function () { unlockTrophy("contacted"); });
});

// 3. Reaching the contact section
const contactSection = document.getElementById("contact");
if ("IntersectionObserver" in window) {
  const contactWatcher = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      unlockTrophy("finale");
      contactWatcher.disconnect();
    }
  }, { threshold: 0.4 });
  contactWatcher.observe(contactSection);
}

/* ---------- 9. Booking form, contact details and footer ---------- */
const repairForm = document.getElementById("repairForm");

repairForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const customerName = document.getElementById("customerName").value.trim();
  const helpType = repairForm.elements["helpType"].value;       // the chip that is ticked
  const consoleType = repairForm.elements["consoleType"].value;
  const problemNote = document.getElementById("problemNote").value.trim();

  let message = "Hello Nelly's Game Hub, ";
  if (customerName) {
    message += "my name is " + customerName + ". ";
  }
  message += "I need help with: " + helpType + " (" + consoleType + ").";
  if (problemNote) {
    message += "\n\nDetails: " + problemNote;
  }

  window.open(buildWhatsAppLink(message), "_blank", "noopener");
  unlockTrophy("repair");
});

// Service tiles that carry data-help tick the matching chip before scrolling to the form
document.querySelectorAll("[data-help]").forEach(function (link) {
  link.addEventListener("click", function () {
    repairForm.querySelectorAll('input[name="helpType"]').forEach(function (radio) {
      radio.checked = (radio.value === link.dataset.help);
    });
  });
});

// Contact details
document.getElementById("phoneText").textContent = shopDetails.phoneNumber;
document.getElementById("callButton").href = "tel:+" + whatsappNumber;
document.getElementById("addressText").textContent = shopDetails.address
  ? shopDetails.address
  : "Message us on WhatsApp and we will send the location";

// Footer year
document.getElementById("currentYear").textContent = new Date().getFullYear();
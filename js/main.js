/* ==========================================================
   Nelly Game Hub, main script
   ========================================================== */

/* ---------- 0. Sound engine ---------- */
const soundStorageKey = "nellysHubSound";
const masterVolume = 2;          // the loudness the sound samples were approved at

let audioContext = null;         // created on the first press, never before
let masterGain = null;           // one volume knob that every sound passes through

function loadSoundChoice() {
  try {
    return localStorage.getItem(soundStorageKey) !== "off";
  } catch (error) {
    return true;                 // storage blocked: sound is on by default
  }
}

function saveSoundChoice() {
  try {
    localStorage.setItem(soundStorageKey, soundIsOn ? "on" : "off");
  } catch (error) {
    // ignore: the choice just will not be remembered
  }
}

let soundIsOn = loadSoundChoice();

// Browsers only allow sound after a press or tap, so this must be called from inside one
function unlockAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { return; }   // very old browser: the site simply stays silent

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = soundIsOn ? masterVolume : 0;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

// Play any sound from the sound bank by name, for example playSound("select")
// Play any sound from the sound bank by name, for example playSound("select")
// The optional second number starts it that many seconds from now
function playSound(name, delaySeconds) {
  if (!soundIsOn || !audioContext || !soundBank[name]) { return; }
  soundBank[name](audioContext, masterGain, audioContext.currentTime + (delaySeconds || 0));
}

const soundToggle = document.getElementById("soundToggle");

function refreshSoundButton() {
  soundToggle.setAttribute("aria-pressed", String(soundIsOn));
  soundToggle.setAttribute(
    "aria-label",
    soundIsOn ? "Sound is on. Press to turn it off." : "Sound is off. Press to turn it on."
  );
}

function setSoundOn(shouldBeOn) {
  soundIsOn = shouldBeOn;
  saveSoundChoice();
  refreshSoundButton();

  if (shouldBeOn) { unlockAudio(); }

  if (masterGain) {
    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    if (shouldBeOn) {
      masterGain.gain.setValueAtTime(masterVolume, now);
    } else {
      masterGain.gain.setTargetAtTime(0, now, 0.05);   // fade out quickly instead of cutting off
    }
  }

  if (shouldBeOn) { playSound("select"); }
}

soundToggle.addEventListener("click", function () { setSoundOn(!soundIsOn); });
refreshSoundButton();

/* ---------- 1. Start screen and boot intro ---------- */
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

const minimumLoadTime = 2600;
let loadStartedAt = 0;               // set at the moment the visitor presses start
let shownPercent = 0;
let pageHasFinishedLoading = false;

window.addEventListener("load", function () {
  pageHasFinishedLoading = true;
});

function startBootIntro() {
  document.body.classList.remove("is-waiting");   // the frozen intro animations start playing
  loadStartedAt = Date.now();

  const progressTimer = setInterval(function () {
    const timeSpent = Date.now() - loadStartedAt;
    const canGoToFull = pageHasFinishedLoading && timeSpent >= minimumLoadTime;
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
}

function finishIntro() {
  setTimeout(function () {
    bootIntro.classList.add("is-done");
    document.body.classList.remove("is-loading");
    playSound("bootImpact");                       // lands exactly on the flash
    setTimeout(function () { unlockTrophy("welcome"); }, 1500);
  }, 450);

  setTimeout(function () { bootIntro.classList.add("is-gone"); }, 1700);
}

// The start screen
const startGate = document.getElementById("startGate");
const startButton = document.getElementById("startButton");
const skipSoundButton = document.getElementById("skipSoundButton");

function leaveStartScreen(withSound) {
  if (startGate.classList.contains("is-leaving")) { return; }   // ignore double taps

  soundIsOn = withSound;
  saveSoundChoice();
  refreshSoundButton();

  if (withSound) {
    unlockAudio();
    playSound("bootRise");
  }

  startGate.classList.add("is-leaving");
  setTimeout(function () { startGate.remove(); }, 600);
  startBootIntro();
}

startGate.addEventListener("click", function () { leaveStartScreen(true); });

skipSoundButton.addEventListener("click", function (event) {
  event.stopPropagation();           // do not let this tap also count as "start with sound"
  leaveStartScreen(false);
});

if (soundIsOn) {
  startButton.focus();               // so Enter or Space also works on a keyboard
} else {
  // The visitor chose silence before, so skip the start screen and respect that
  startGate.remove();
  startBootIntro();
}``

/* ---------- 2. Shop details (edit these when real info is ready) ---------- */
const shopDetails = {
  phoneNumber: "09068466118",
  address: "2B Victory Plaza, Francis Oremeji Street, Computer Village, Ikeja"            // leave empty until we know the real address
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
  const wasOpen = mainNav.classList.contains("is-open");
  if (shouldOpen !== wasOpen) { playSound(shouldOpen ? "menuOpen" : "menuClose"); }

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
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  starCanvas.width = window.innerWidth * pixelRatio;
  starCanvas.height = window.innerHeight * pixelRatio;
  starPen.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // More stars on big screens, fewer on small ones. Phones get a lower ceiling.
  const maxStars = window.innerWidth < 760 ? 90 : 220;
  const starCount = Math.min(maxStars, Math.floor((window.innerWidth * window.innerHeight) / 6500));
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
// Draw at a fraction of the screen size: faster, and it softens the edges for free.
// Phones get an even smaller canvas because they have less power to spare.
const waveScale = window.innerWidth < 760 ? 0.35 : 0.5;

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
let currentTile = null;   // the tile that is focused right now, so we only tick when it changes
let lastScrollTime = 0;   // when the page last scrolled

// Scrolling slides tiles under a resting mouse, and that should not make a row of ticks
window.addEventListener("scroll", function () { lastScrollTime = Date.now(); }, { passive: true });

function focusTile(chosenTile) {
  const justScrolled = Date.now() - lastScrollTime < 200;
  if (chosenTile && chosenTile !== currentTile && !justScrolled) { playSound("tick"); }
  currentTile = chosenTile;
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
  welcome:   { tier: "bronze", title: "Welcome, Player 1", note: "You found Nelly Game Hub." },
  services:  { tier: "bronze", title: "Window Shopper",    note: "You checked out what we do." },
  browsing:  { tier: "silver", title: "Menu Master",       note: "You browsed every service." },
  contacted: { tier: "gold",   title: "Player 2 Joined",   note: "You started a chat with us." },
  repair:    { tier: "gold",   title: "Repair Requested",  note: "Hit send on WhatsApp to lock it in." },
  finale:    { tier: "silver", title: "Final Level",       note: "You made it to the bottom of the page." },
  watcher:   { tier: "silver", title: "Front Row Seat",    note: "You pressed play on a repair video." }
};

const trophyIconMarkup =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>' +
  '<path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>' +
  '<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>' +
  '<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

// Trophies are remembered in the visitor's browser, so a returning visitor is not shown the same ones again
const trophyStorageKey = "nellysHubTrophies";

function loadEarnedTrophies() {
  try {
    const saved = JSON.parse(localStorage.getItem(trophyStorageKey));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];   // storage blocked or the saved text was damaged: start fresh
  }
}

function saveEarnedTrophies() {
  try {
    localStorage.setItem(trophyStorageKey, JSON.stringify(Array.from(unlockedTrophies)));
  } catch (error) {
    // private mode or storage full: the site still works, trophies just will not be remembered
  }
}

const unlockedTrophies = new Set(loadEarnedTrophies());   // trophies this visitor has ever earned
const waitingTrophies = [];           // trophies lined up to be shown
let trophyIsShowing = false;
// Which sound each trophy rank plays
const trophySoundNames = { bronze: "trophyBronze", silver: "trophySilver", gold: "trophyGold" };

// Call this from anywhere with a trophy name, for example unlockTrophy("welcome")
function unlockTrophy(trophyId) {
  if (!trophyList[trophyId] || unlockedTrophies.has(trophyId)) { return; }

  unlockedTrophies.add(trophyId);
  saveEarnedTrophies();
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
  playSound(trophySoundNames[trophy.tier], 0.25);   // a quarter second late, so it follows any button click sound

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

  let message = "Hello Nelly Game Hub, ";
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

// Directions button: only appears once a real address exists
const directionsButton = document.getElementById("directionsButton");
if (shopDetails.address) {
  directionsButton.href = "https://maps.app.goo.gl/ewCFU5TN2npBmadK8?g_st=iwb" + encodeURIComponent(shopDetails.address);
  directionsButton.target = "_blank";
  directionsButton.rel = "noopener";
  directionsButton.hidden = false;
}

// Footer year
document.getElementById("currentYear").textContent = new Date().getFullYear();

/* ---------- 10. Videos from TikTok and Instagram ---------- */
// Paste the full link of each video. The site works out the rest.
const shopVideos = [
     { url: "https://www.tiktok.com/@gamerepairs/video/7681234889802485013", title: "TMR upgrade... " },
     { url: "https://www.tiktok.com/@gamerepairs/video/7685735040017239316", title: "ps5 Beeps but no power" },
     { url: "https://www.tiktok.com/@gamerepairs/video/7677889285718314260", title: "3 beep of death on ps5 fixed..." },
     { url: "https://www.instagram.com/p/DcHIoCJNtw2/", title: "davibes_olamide live @ nellygamehub" },
     { url: "https://www.instagram.com/p/Dbxj6U5tasH/", title: "Stick Drift Fixed" },
     { url: "https://www.instagram.com/p/Dbp02Q8NYHR/", title: "Ps4 won't charge controller fixed..." }
];
const videosPerView = 3;   // how many videos show at once

const videoGrid = document.getElementById("videoGrid");
const videoEmpty = document.getElementById("videoEmpty");
const shuffleButton = document.getElementById("shuffleButton");

// Turns a pasted link into: which app it is from, and the web address of that app's video player
function readVideoLink(link) {
  let address;
  try {
    address = new URL(link);
  } catch (error) {
    return null;   // not a proper web address
  }

  const host = address.hostname.replace("www.", "");

  if (host === "tiktok.com") {
    const match = address.pathname.match(/\/video\/(\d+)/);
    if (match) {
      return {
        platform: "TikTok",
        playerUrl: "https://www.tiktok.com/player/v1/" + match[1] + "?autoplay=1&rel=0&description=1"
      };
    }
  }

  if (host === "instagram.com") {
    const match = address.pathname.match(/\/(reel|p|tv)\/([\w-]+)/);
    if (match) {
      return {
        platform: "Instagram",
        playerUrl: "https://www.instagram.com/" + match[1] + "/" + match[2] + "/embed"
      };
    }
  }

  return null;
}

// Keep only the videos whose links we can understand, and warn about the rest
const playableVideos = [];
shopVideos.forEach(function (video) {
  const details = readVideoLink(video.url);
  if (details) {
    playableVideos.push(Object.assign({}, video, details));
  } else {
    console.warn("Could not read this video link: " + video.url);
  }
});

// A fair shuffle: swap each item with a random one before it
function shuffleList(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const held = copy[i];
    copy[i] = copy[j];
    copy[j] = held;
  }
  return copy;
}

// The shuffled pile we deal from. When it runs out we shuffle again,
// so videos do not come back until the others have had a turn.
let videoPile = [];

function dealVideos() {
  const wanted = Math.min(videosPerView, playableVideos.length);
  const batch = [];
  while (batch.length < wanted) {
    if (videoPile.length === 0) { videoPile = shuffleList(playableVideos); }
    const candidate = videoPile.pop();
    if (!batch.includes(candidate)) { batch.push(candidate); }
  }
  return batch;
}

function makeVideoCard(video, position) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "video-card";
  card.dataset.platform = video.platform;
  card.style.setProperty("--i", position);
  card.setAttribute("aria-label", "Play " + video.platform + " video: " + video.title);

  const platformTag = document.createElement("span");
  platformTag.className = "video-platform";
  platformTag.textContent = video.platform;

  const playIcon = document.createElement("span");
  playIcon.className = "video-play";

  const title = document.createElement("span");
  title.className = "video-title";
  title.textContent = video.title;

  card.append(platformTag, playIcon, title);

  card.addEventListener("click", function () {
    const player = document.createElement("iframe");
    player.className = "video-frame";
    player.src = video.playerUrl;
    player.title = video.title;
    player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    player.allowFullscreen = true;
    card.replaceWith(player);
    unlockTrophy("watcher");
  });

  return card;
}

function showVideos() {
  videoGrid.replaceChildren();
  dealVideos().forEach(function (video, position) {
    videoGrid.appendChild(makeVideoCard(video, position));
  });
}

if (playableVideos.length > 0) {
  videoEmpty.hidden = true;
  showVideos();                       // a different set on every visit
  if (playableVideos.length > videosPerView) {
    shuffleButton.hidden = false;     // only useful when there are more videos than fit on screen
    shuffleButton.addEventListener("click", showVideos);
  }
}
/* ---------- 11. Opening hours and the open or closed badge ---------- */
const openingHours = {
  openDays: [1, 2, 3, 4, 5, 6],   // 0 = Sunday, 1 = Monday ... 6 = Saturday
  opensAt: 8,                     // 24-hour clock, so 8 is 8:00 am
  closesAt: 17,                   // 17 is 5:00 pm
  label: "Monday to Saturday, 8:00 am to 5:00 pm"
};

const hoursText = document.getElementById("hoursText");
const openStatus = document.getElementById("openStatus");
hoursText.textContent = openingHours.label;

// What day and time is it at the shop right now? Always Lagos time, wherever the visitor is.
function getShopTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  }).formatToParts(new Date());

  const found = {};
  parts.forEach(function (part) { found[part.type] = part.value; });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    day: dayNames.indexOf(found.weekday),
    minutesIntoDay: (Number(found.hour) % 24) * 60 + Number(found.minute)
  };
}

function updateOpenStatus() {
  const now = getShopTime();
  const isOpenToday = openingHours.openDays.includes(now.day);
  const isOpen = isOpenToday &&
    now.minutesIntoDay >= openingHours.opensAt * 60 &&
    now.minutesIntoDay < openingHours.closesAt * 60;

  openStatus.textContent = isOpen ? "Open now" : "Closed now";
  openStatus.classList.toggle("is-open", isOpen);
}

updateOpenStatus();
setInterval(updateOpenStatus, 60000);   // re-check every minute for people who leave the page open

/* ---------- 12. Sounds for buttons, form chips and the logo ---------- */
// One listener covers every button on the page, now and in the future
document.addEventListener("click", function (event) {
  if (event.target.closest(".btn, .tile-action, .float-whatsapp")) {
    playSound("select");
  }
});

// Picking an option chip in the booking form
document.querySelectorAll(".chips input").forEach(function (radio) {
  radio.addEventListener("change", function () { playSound("chip"); });
});

// The hero logo wakes up when the mouse touches it (mouse devices only, and not more than once every 2 seconds)
const heroLogo = document.querySelector(".hero-logo");
if (heroLogo && deviceHasMouse) {
  let logoSoundReadyAt = 0;

  heroLogo.addEventListener("mouseenter", function () {
    const now = Date.now();
    if (now < logoSoundReadyAt) { return; }
    logoSoundReadyAt = now + 2000;
    playSound("logoHover");
  });
}
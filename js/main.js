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

/* ---------- 4. Starfield background ---------- */
const starCanvas = document.getElementById("starfield");
const starPen = starCanvas.getContext("2d");
const userWantsLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let starList = [];
let lastScreenWidth = window.innerWidth;

function makeStars() {
  // Scale the canvas up on sharp screens so the stars are not blurry
  const pixelRatio = window.devicePixelRatio || 1;
  starCanvas.width = window.innerWidth * pixelRatio;
  starCanvas.height = window.innerHeight * pixelRatio;
  starPen.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // More stars on big screens, fewer on small ones, never more than 160
  const starCount = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 9000));
  starList = [];

  for (let i = 0; i < starCount; i++) {
    starList.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.8 + 0.8,
      driftSpeed: Math.random() * 0.25 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
      isBlue: Math.random() < 0.25
    });
  }
}

function drawStars(timeNow) {
  starPen.clearRect(0, 0, window.innerWidth, window.innerHeight);

  starList.forEach(function (star) {
    if (!userWantsLessMotion) {
      star.y += star.driftSpeed;
      // When a star drifts off the bottom, bring it back at the top somewhere new
      if (star.y > window.innerHeight) {
        star.y = 0;
        star.x = Math.random() * window.innerWidth;
      }
    }

    // Brightness rises and falls like a sine wave, so each star twinkles
    const brightness = 0.5 + 0.5 * Math.sin(timeNow / 600 + star.twinkleOffset);
    starPen.globalAlpha = 0.25 + brightness * 0.75;
    starPen.fillStyle = star.isBlue ? "#4fd8ff" : "#ffffff";
    starPen.fillRect(star.x, star.y, star.size, star.size);
  });

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
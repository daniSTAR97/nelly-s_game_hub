/* The sound bank. Every sound is a recipe: it is given an audio context,
   somewhere to send its sound, and the moment to start. */

// One note: an oscillator whose volume rises quickly and then fades away
function playTone(ctx, out, options) {
  const note = Object.assign(
    { type: "sine", from: 440, to: null, start: 0, length: 0.2, volume: 0.2, attack: 0.008 },
    options
  );

  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = note.type;
  oscillator.frequency.setValueAtTime(note.from, note.start);
  if (note.to) {
    oscillator.frequency.exponentialRampToValueAtTime(note.to, note.start + note.length);
  }

  envelope.gain.setValueAtTime(0.0001, note.start);
  envelope.gain.exponentialRampToValueAtTime(note.volume, note.start + note.attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, note.start + note.length);

  oscillator.connect(envelope);
  envelope.connect(out);
  oscillator.start(note.start);
  oscillator.stop(note.start + note.length + 0.05);
}

// A whoosh: random noise squeezed through a filter that sweeps from one pitch to another
function playWhoosh(ctx, out, start, length, fromPitch, toPitch, volume, peakShare) {
  const peakAt = peakShare === undefined ? 0.4 : peakShare;
  const frames = Math.floor(ctx.sampleRate * length);
  const noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(fromPitch, start);
  filter.frequency.exponentialRampToValueAtTime(toPitch, start + length);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + length * peakAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(out);
  source.start(start);
}

// A bell-like note: the main tone plus a quieter tone one octave above
function playBell(ctx, out, pitch, start, length, volume) {
  playTone(ctx, out, { from: pitch, start: start, length: length, volume: volume });
  playTone(ctx, out, { type: "triangle", from: pitch * 2, start: start, length: length * 0.7, volume: volume * 0.3 });
}

// A room: random noise that fades away makes a believable echo when mixed in quietly
function makeReverb(ctx, out, seconds, wetLevel) {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, frames, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = wetLevel;
  convolver.connect(wet);
  wet.connect(out);
  return convolver;   // send sound into this to put it "in the room"
}

// A repeating echo: each repeat is quieter than the last
function makeEcho(ctx, out, delaySeconds, feedback, wetLevel) {
  const delay = ctx.createDelay(1);
  delay.delayTime.value = delaySeconds;
  const repeat = ctx.createGain();
  repeat.gain.value = feedback;
  const wet = ctx.createGain();
  wet.gain.value = wetLevel;
  delay.connect(repeat);
  repeat.connect(delay);
  delay.connect(wet);
  wet.connect(out);
  return delay;
}

// One pad note: three slightly out-of-tune saw waves, with a filter that slowly opens
function playPadNote(ctx, dryOut, roomIn, pitch, start, length, volume, pan) {
  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0.0001, start);
  voice.gain.exponentialRampToValueAtTime(volume, start + length * 0.45);
  voice.gain.exponentialRampToValueAtTime(0.0001, start + length);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(250, start);
  filter.frequency.exponentialRampToValueAtTime(3200, start + length * 0.8);

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  [-9, 0, 9].forEach(function (detuneCents) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = pitch;
    oscillator.detune.value = detuneCents;
    oscillator.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + length + 0.1);
  });

  filter.connect(voice);
  voice.connect(panner);
  panner.connect(dryOut);
  panner.connect(roomIn);
}

const soundBank = {
  // PART 1 of the start-up, played when the visitor presses PRESS START:
  // a deep swell, a wide pad that opens up like a curtain, and a rising sweep
  bootRise: function (ctx, out, t) {
    // Overall level of this sound, so all its layers together never get too loud
    const levelControl = ctx.createGain();
    levelControl.gain.value = 0.62;
    levelControl.connect(out);
    out = levelControl;

    const room = makeReverb(ctx, out, 2.4, 0.5);

    playTone(ctx, out, { type: "sine", from: 55, to: 73.4, start: t, length: 4.6, volume: 0.25, attack: 1.4 });   // deep rumble under everything
    playWhoosh(ctx, out, t + 0.1, 3.3, 200, 7000, 0.3, 0.95);                                                     // rising sweep

    // The pad: a D chord with a bright added note, notes arriving one after another
    playPadNote(ctx, out, room, 146.83, t,       4.8, 0.075, -0.5);   // D3
    playPadNote(ctx, out, room, 220.0,  t + 0.3, 4.6, 0.075,  0.5);   // A3
    playPadNote(ctx, out, room, 293.66, t + 0.6, 4.4, 0.07, -0.3);    // D4
    playPadNote(ctx, out, room, 369.99, t + 0.9, 4.2, 0.07, 0.3);     // F#4
    playPadNote(ctx, out, room, 440.0,  t + 1.2, 4.0, 0.06, -0.6);    // A4
    playPadNote(ctx, out, room, 659.25, t + 1.5, 3.8, 0.055, 0.6);    // E5
  },

  // PART 2, played at the moment the logo flashes: an impact, a crash, and a sparkling run of notes
  bootImpact: function (ctx, out, t) {
    const levelControl = ctx.createGain();
    levelControl.gain.value = 0.62;
    levelControl.connect(out);
    out = levelControl;

    const room = makeReverb(ctx, out, 2.4, 0.55);
    const echo = makeEcho(ctx, room, 0.27, 0.38, 0.5);

    // Everything that sparkles goes through one bus that feeds the speakers, the room and the echo
    const sparkleBus = ctx.createGain();
    sparkleBus.connect(out);
    sparkleBus.connect(room);
    sparkleBus.connect(echo);

    // The hit
    playTone(ctx, out, { from: 140, to: 38, start: t, length: 0.7, volume: 0.3, attack: 0.004 });
    playWhoosh(ctx, out, t, 1.0, 6500, 700, 0.3, 0.02);

    // A bright chord stab
    playBell(ctx, sparkleBus, 293.66, t, 1.8, 0.07);    // D4
    playBell(ctx, sparkleBus, 440.0, t, 1.8, 0.07);     // A4
    playBell(ctx, sparkleBus, 739.99, t, 1.8, 0.065);   // F#5

    // The run of notes climbing upward
    [587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0].forEach(function (pitch, index) {
      playBell(ctx, sparkleBus, pitch, t + 0.16 + index * 0.085, 1.6, 0.07);
    });
  },

  // Moving between menu items
  tick: function (ctx, out, t) {
    playTone(ctx, out, { type: "triangle", from: 1200, to: 800, start: t, length: 0.05, volume: 0.12 });
  },

  // Choosing something
  select: function (ctx, out, t) {
    playTone(ctx, out, { type: "triangle", from: 700, start: t, length: 0.09, volume: 0.15 });
    playTone(ctx, out, { type: "triangle", from: 1050, start: t + 0.07, length: 0.16, volume: 0.15 });
  },

  // Picking an option chip in the form
  chip: function (ctx, out, t) {
    playTone(ctx, out, { from: 600, to: 820, start: t, length: 0.06, volume: 0.12 });
  },

  trophyBronze: function (ctx, out, t) {
    playBell(ctx, out, 784, t, 0.7, 0.16);
    playBell(ctx, out, 1175, t + 0.12, 0.9, 0.16);
  },

  trophySilver: function (ctx, out, t) {
    playBell(ctx, out, 784, t, 0.7, 0.16);
    playBell(ctx, out, 988, t + 0.11, 0.8, 0.16);
    playBell(ctx, out, 1319, t + 0.22, 1.1, 0.16);
  },

  trophyGold: function (ctx, out, t) {
    playBell(ctx, out, 523, t, 0.7, 0.16);
    playBell(ctx, out, 659, t + 0.1, 0.7, 0.16);
    playBell(ctx, out, 784, t + 0.2, 0.8, 0.16);
    playBell(ctx, out, 1047, t + 0.3, 1.0, 0.16);
    playBell(ctx, out, 1568, t + 0.42, 1.6, 0.14);
    playBell(ctx, out, 2093, t + 0.52, 1.4, 0.07);
  },

  // The logo waking up when the mouse touches it
  logoHover: function (ctx, out, t) {
    playTone(ctx, out, { type: "sine", from: 90, to: 160, start: t, length: 0.55, volume: 0.28, attack: 0.1 });
    playTone(ctx, out, { type: "triangle", from: 180, to: 320, start: t, length: 0.45, volume: 0.1, attack: 0.1 });
  },

  menuOpen: function (ctx, out, t) {
    playWhoosh(ctx, out, t, 0.28, 400, 2400, 0.5);
  },

  menuClose: function (ctx, out, t) {
    playWhoosh(ctx, out, t, 0.28, 2400, 400, 0.5);
  }
};
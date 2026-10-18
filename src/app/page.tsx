"use client";

import { useEffect, useRef, useCallback } from "react";

// ===== HELPERS =====
const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

export default function GamePage() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const gmRef = useRef<HTMLCanvasElement>(null);
  const fwRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<GameState | null>(null);

  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number; color: string;
    life: number; decay: number;
    type: string; rotation: number;
    rotSpeed: number; gravity: number;
    wobble?: number; wobbleSpeed?: number;
  }
  interface BgStar { x: number; y: number; r: number; phase: number; speed: number; }
  interface FloatHeart { x: number; y: number; s: number; speed: number; wobble: number; wobbleSpd: number; alpha: number; color: string; }
  interface GameStar { x: number; y: number; r: number; speed: number; rot: number; rotSpd: number; glow: number; glowDir: number; alive: boolean; }
  interface Sparkle { x: number; y: number; size: number; life: number; decay: number; color: string; }
  interface FwParticle { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; decay: number; gravity: number; }
  interface FwRocket { x: number; y: number; tx: number; ty: number; speed: number; color: string; trail: { x: number; y: number; life: number }[]; }

  interface GameState {
    currentStage: number;
    mouseX: number; mouseY: number;
    bgStars: BgStar[];
    floatHearts: FloatHeart[];
    fxParticles: Particle[];
    gameStars: GameStar[];
    gameSparkles: Sparkle[];
    starsCaught: number;
    starSpawnTimer: number;
    starGameActive: boolean;
    fwParticles: FwParticle[];
    fwRockets: FwRocket[];
    fireworkCount: number;
    fwActive: boolean;
    audioCtx: AudioContext | null;
    audioOn: boolean;
    melodyTimer: ReturnType<typeof setTimeout> | null;
    lastTime: number;
    animFrame: number;
    finalInited: boolean;
  }

  // Romantic messages in English from Julian to Gamze
  const starMessages = [
    "Your smile lights up my whole universe, Gamze ☀️",
    "Out of 8 billion people, my eyes only search for you ✨",
    "Every heartbeat whispered your name before I even met you 💓",
    "You are the breathtaking poetry written in the constellations 🌌",
    "With you, every simple second feels like pure magic 🧚‍♀️",
    "You didn't just walk into my life, you became my entire world 🌍",
    "Forever grateful that fate brought me to you, my angel 💫",
  ];

  const letterLines = [
    { text: "My Dearest Gamze,", cls: "highlight" },
    { text: "" },
    { text: "From the very first second you entered my world," },
    { text: "time quietly stood still, and my heart beat with a new rhythm." },
    { text: "" },
    { text: "Your smile is warmer than the first golden rays of dawn," },
    { text: "so gentle, so rare, turning ordinary moments into pure wonder." },
    { text: "" },
    { text: "Your eyes hold a universe of dreams," },
    { text: "shining brighter than every star in the midnight sky." },
    { text: "" },
    { text: "With each passing day, I find countless new reasons" },
    { text: "to fall even deeper in love with you." },
    { text: "" },
    { text: "You are my favorite thought, my deepest peace," },
    { text: "and the sweetest reality I could ever dream of." },
    { text: "" },
    { text: "No matter where life takes us," },
    { text: "my heart will always beat right beside yours." },
    { text: "" },
    { text: "I love you more than words could ever tell... 💕", cls: "highlight" },
    { text: "Yours truly & forever,", cls: "signature-label" },
    { text: "Julian Martin 🌹", cls: "highlight signature-name" },
  ];

  const fwColors = [
    "#ff69b4", "#ff1493", "#ff6b6b", "#ffd700",
    "#87ceeb", "#98fb98", "#dda0dd", "#ffa07a",
    "#ff4500", "#00ced1", "#ff00ff", "#7fff00",
  ];

  // ===== DRAWING HELPERS =====
  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.8, -s, -s * 0.2, 0, s * 0.5);
    ctx.bezierCurveTo(s, -s * 0.2, s * 0.5, -s * 0.8, 0, -s * 0.3);
    ctx.fill();
    ctx.restore();
  };

  const draw5Star = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.4;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
              : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // ===== AUDIO =====
  const playTone = (st: GameState, freq: number, dur: number, time: number, type: OscillatorType = "sine", vol = 0.06) => {
    if (!st.audioCtx || !st.audioOn) return;
    const o = st.audioCtx.createOscillator();
    const g = st.audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(st.audioCtx.destination);
    o.start(time);
    o.stop(time + dur + 0.01);
  };

  const playMelody = useCallback((st: GameState) => {
    if (!st.audioCtx || !st.audioOn) return;
    const t = st.audioCtx.currentTime + 0.05;
    const notes: [number, number][] = [
      [523.25, 0.6], [659.25, 0.6], [783.99, 0.6], [1046.50, 0.9],
      [987.77, 0.5], [880.00, 0.5], [783.99, 0.9],
      [698.46, 0.5], [659.25, 0.5], [587.33, 0.5], [659.25, 0.9],
      [523.25, 0.6], [659.25, 0.6], [783.99, 0.6], [880.00, 0.9],
      [783.99, 0.5], [659.25, 0.5], [523.25, 1.2],
    ];
    let offset = 0;
    notes.forEach(([f, d]) => {
      playTone(st, f, d * 1.2, t + offset, "sine", 0.04);
      playTone(st, f / 2, d * 1.2, t + offset, "sine", 0.015);
      playTone(st, f * 1.5, d * 0.6, t + offset + 0.05, "sine", 0.01);
      offset += d * 0.45;
    });
    st.melodyTimer = setTimeout(() => playMelody(st), offset * 1000 + 800);
  }, []);

  const playSfx = (st: GameState, type: string) => {
    if (!st.audioCtx || !st.audioOn) return;
    const t = st.audioCtx.currentTime;
    switch (type) {
      case "sparkle":
        for (let i = 0; i < 4; i++) playTone(st, 1200 + i * 400, 0.15, t + i * 0.06, "sine", 0.03);
        break;
      case "catch":
        playTone(st, 880, 0.2, t, "sine", 0.06);
        playTone(st, 1108, 0.2, t + 0.1, "sine", 0.05);
        playTone(st, 1318, 0.3, t + 0.2, "sine", 0.04);
        break;
      case "boom":
        playTone(st, 120, 0.4, t, "sawtooth", 0.07);
        playTone(st, 80, 0.6, t + 0.05, "square", 0.04);
        for (let i = 0; i < 5; i++) playTone(st, rand(800, 2000), 0.2, t + 0.1 + i * 0.04, "sine", 0.02);
        break;
      case "whoosh":
        playTone(st, 200, 0.5, t, "sine", 0.04);
        playTone(st, 600, 0.4, t + 0.1, "sine", 0.03);
        break;
      case "reveal": {
        const scale = [523, 587, 659, 698, 783, 880, 987, 1046];
        scale.forEach((f, i) => playTone(st, f, 0.4, t + i * 0.08, "sine", 0.04));
        break;
      }
      case "letterPop":
        playTone(st, rand(600, 900), 0.12, t, "sine", 0.025);
        break;
    }
  };

  // ===== PARTICLE SPAWNERS =====
  const spawnFxParticle = (st: GameState, x: number, y: number, opts: Partial<Particle> = {}) => {
    st.fxParticles.push({
      x, y,
      vx: opts.vx ?? rand(-2, 2),
      vy: opts.vy ?? rand(-3, -0.5),
      size: opts.size ?? rand(2, 5),
      color: opts.color ?? "#ff69b4",
      life: 1,
      decay: opts.decay ?? rand(0.008, 0.02),
      type: opts.type ?? "circle",
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.1, 0.1),
      gravity: opts.gravity !== undefined ? opts.gravity : 0.02,
    });
  };

  const spawnPetal = (st: GameState) => {
    const W = window.innerWidth;
    st.fxParticles.push({
      x: rand(-20, W + 20), y: -20,
      vx: rand(-0.5, 0.5), vy: rand(0.5, 1.5),
      size: rand(6, 14),
      color: ["#ff69b4", "#ff1493", "#db7093", "#ffb6c1", "#ff6b6b"][randInt(0, 4)],
      life: 1, decay: 0.001,
      type: "petal",
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.03, 0.03),
      gravity: 0,
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.015, 0.04),
    });
  };

  const spawnConfetti = (st: GameState, cx: number, cy: number) => {
    for (let i = 0; i < 90; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(3, 13);
      st.fxParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: rand(3, 9),
        color: ["#ff69b4","#ffd700","#ff6b6b","#87ceeb","#98fb98","#dda0dd","#ff1493","#ffa07a"][randInt(0,7)],
        life: 1, decay: rand(0.003, 0.008),
        type: "confetti",
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.15, 0.15),
        gravity: 0.08,
      });
    }
  };

  // ===== STAGE TRANSITIONS =====
  const goToStage = useCallback((st: GameState, n: number) => {
    const overlay = document.getElementById("transOverlay");
    const oldStage = st.currentStage >= 0 ? document.getElementById(`stage${st.currentStage}`) : null;

    playSfx(st, "whoosh");
    overlay?.classList.add("active");

    setTimeout(() => {
      if (oldStage) oldStage.classList.remove("active");
      st.currentStage = n;
      const newStage = document.getElementById(`stage${n}`);
      newStage?.classList.add("active");

      switch (n) {
        case 0: startIntro(st); break;
        case 1: startStarGame(st); break;
        case 2: startLetter(st); break;
        case 3: startFireworks(st); break;
        case 4: startFinal(st); break;
      }

      setTimeout(() => overlay?.classList.remove("active"), 300);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== STAGE 0: INTRO =====
  const startIntro = (st: GameState) => {
    const el = document.getElementById("introTitle");
    if (!el) return;
    const text = "A Special Surprise For Gamze... 💫";
    el.innerHTML = "";
    let i = 0;
    function typeNext() {
      if (i < text.length) {
        el!.innerHTML = text.substring(0, i + 1) + '<span class="cursor-blink"></span>';
        i++;
        playSfx(st, "letterPop");
        setTimeout(typeNext, 35 + rand(0, 20));
      } else {
        setTimeout(() => {
          el!.innerHTML = text;
          document.getElementById("introSubtitle")?.classList.add("sub-visible");
          setTimeout(() => {
            document.getElementById("btnStart")?.classList.add("btn-visible");
          }, 200);
        }, 250);
      }
    }
    setTimeout(typeNext, 300);
  };

  // ===== STAGE 1: STAR GAME =====
  const spawnGameStar = (st: GameState) => {
    const W = window.innerWidth;
    st.gameStars.push({
      x: rand(60, W - 60), y: rand(-200, -30),
      r: rand(18, 28), speed: rand(0.5, 1.5),
      rot: 0, rotSpd: rand(-0.02, 0.02),
      glow: 0, glowDir: 1, alive: true,
    });
  };

  const startStarGame = (st: GameState) => {
    const c = gmRef.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    c.style.pointerEvents = "all";
    st.gameStars = [];
    st.gameSparkles = [];
    st.starsCaught = 0;
    st.starSpawnTimer = 0;
    st.starGameActive = true;
    const countEl = document.getElementById("starCount");
    if (countEl) countEl.textContent = "0";
    for (let i = 0; i < 3; i++) spawnGameStar(st);
  };

  // ===== STAGE 2: LOVE LETTER =====
  const startLetter = (st: GameState) => {
    const box = document.getElementById("letterBox");
    if (!box) return;
    box.innerHTML = "";
    letterLines.forEach((line) => {
      const div = document.createElement("div");
      div.className = "letter-line" + (line.cls ? " " + line.cls : "");
      div.textContent = line.text || "\u00A0";
      box.appendChild(div);
    });
    const lines = box.querySelectorAll(".letter-line");
    lines.forEach((line, i) => {
      setTimeout(() => {
        line.classList.add("show");
        playSfx(st, "letterPop");
        box.scrollTop = box.scrollHeight;
      }, 400 + i * 360);
    });
    setTimeout(() => {
      document.getElementById("btnLetter")?.classList.add("btn-visible");
    }, 400 + lines.length * 360 + 600);
  };

  // ===== STAGE 3: FIREWORKS =====
  const startFireworks = (st: GameState) => {
    const c = fwRef.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    c.style.pointerEvents = "all";
    st.fwParticles = [];
    st.fwRockets = [];
    st.fireworkCount = 0;
    st.fwActive = true;
    const countEl = document.getElementById("fwCount");
    if (countEl) countEl.textContent = "0";
  };

  const heartShape = (t: number) => {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    return { x, y };
  };

  const explodeHeart = (st: GameState, cx: number, cy: number, color: string) => {
    const scale = rand(3, 6);
    for (let t = 0; t < Math.PI * 2; t += 0.08) {
      const h = heartShape(t);
      const speed = rand(0.8, 1.2);
      st.fwParticles.push({
        x: cx, y: cy,
        vx: h.x * scale * 0.04 * speed,
        vy: h.y * scale * 0.04 * speed,
        size: rand(2, 4), color,
        life: 1, decay: rand(0.006, 0.014),
        gravity: 0.015,
      });
    }
    for (let i = 0; i < 15; i++) {
      const angle = rand(0, Math.PI * 2);
      const spd = rand(1, 4);
      st.fwParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        size: rand(1, 2.5), color: "#fff",
        life: 1, decay: rand(0.01, 0.025), gravity: 0.02,
      });
    }
  };

  const launchRocket = (st: GameState, tx: number, ty: number) => {
    const H = window.innerHeight;
    st.fwRockets.push({
      x: tx, y: H, tx, ty,
      speed: rand(8, 12),
      color: fwColors[randInt(0, fwColors.length - 1)],
      trail: [],
    });
    playSfx(st, "boom");
  };

  // ===== STAGE 4: FINAL =====
  const photoList = [
    { src: "/photos/photo1.jpg", caption: "The moment my whole world paused for you ✨" },
    { src: "/photos/photo2.jpg", caption: "Your pure radiance outshines the universe 💖" },
    { src: "/photos/photo3.jpg", caption: "Every heartbeat feels warmer by your side 🌸" },
    { src: "/photos/photo4.jpg", caption: "My favorite smile in the entire world ☀️" },
    { src: "/photos/photo5.jpg", caption: "With you, every small second is unforgettable 🌹" },
    { src: "/photos/photo6.jpg", caption: "The gentle magic in your eyes 💫" },
    { src: "/photos/photo7.jpg", caption: "Precious memories engraved in my soul 💕" },
    { src: "/photos/photo8.jpg", caption: "You are the poetry I always wanted to write 🕊️" },
    { src: "/photos/photo9.jpg", caption: "Forever captivated by your beauty 💎" },
    { src: "/photos/photo10.jpg", caption: "My greatest blessing, my sweetest reality 🍀" },
    { src: "/photos/photo11.jpg", caption: "Every chapter with you is a fairytale 👑" },
  ];

  let currentPhotoIdx = 0;
  let photoSlideInterval: ReturnType<typeof setInterval> | null = null;

  const showPhoto = (idx: number) => {
    currentPhotoIdx = (idx + photoList.length) % photoList.length;
    const img = document.getElementById("mainPhoto") as HTMLImageElement | null;
    const caption = document.getElementById("photoCaption");
    const counter = document.getElementById("photoCounter");
    const thumbs = document.querySelectorAll(".photo-thumb");

    if (img) {
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = photoList[currentPhotoIdx].src;
        img.style.opacity = "1";
      }, 250);
    }
    if (caption) {
      caption.style.opacity = "0";
      setTimeout(() => {
        caption.textContent = photoList[currentPhotoIdx].caption;
        caption.style.opacity = "1";
      }, 250);
    }
    if (counter) {
      counter.textContent = `${currentPhotoIdx + 1} / ${photoList.length}`;
    }
    thumbs.forEach((th, i) => {
      if (i === currentPhotoIdx) th.classList.add("active");
      else th.classList.remove("active");
    });
  };

  const startFinal = (st: GameState) => {
    if (st.finalInited) return;
    st.finalInited = true;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cont = document.getElementById("photoCont");

    setTimeout(() => {
      spawnConfetti(st, W / 2, H / 2);
      playSfx(st, "reveal");
    }, 800);

    setTimeout(() => document.getElementById("finalTitle")?.classList.add("show"), 1200);
    setTimeout(() => document.getElementById("finalAuthor")?.classList.add("show"), 1800);
    setTimeout(() => document.getElementById("finalGallery")?.classList.add("show"), 2400);
    setTimeout(() => document.getElementById("finalSub")?.classList.add("show"), 3200);

    showPhoto(0);

    // Auto slideshow every 5s
    photoSlideInterval = setInterval(() => {
      if (st.currentStage === 4) {
        showPhoto(currentPhotoIdx + 1);
      }
    }, 5000);

    // Attach Prev / Next / Thumbnail controls
    document.getElementById("btnPrevPhoto")?.addEventListener("click", () => {
      if (photoSlideInterval) clearInterval(photoSlideInterval);
      showPhoto(currentPhotoIdx - 1);
    });
    document.getElementById("btnNextPhoto")?.addEventListener("click", () => {
      if (photoSlideInterval) clearInterval(photoSlideInterval);
      showPhoto(currentPhotoIdx + 1);
    });
    document.querySelectorAll(".photo-thumb").forEach((th, i) => {
      th.addEventListener("click", () => {
        if (photoSlideInterval) clearInterval(photoSlideInterval);
        showPhoto(i);
      });
    });

    const orbitEmoji = ["❤️","💖","💕","💗","💓","✨","🌹"];
    orbitEmoji.forEach((emoji, i) => {
      const heart = document.createElement("div");
      heart.className = "heart-orbit";
      heart.textContent = emoji;
      heart.style.animationDelay = `${-i * (6 / orbitEmoji.length)}s`;
      heart.style.animationDuration = `${5 + i * 0.5}s`;
      cont?.appendChild(heart);
    });

    setInterval(() => {
      if (st.currentStage === 4) {
        for (let i = 0; i < 2; i++) {
          spawnFxParticle(st, rand(0, window.innerWidth), -10, {
            vx: rand(-0.5, 0.5), vy: rand(1, 3),
            size: rand(6, 14),
            color: ["#ff69b4","#ff1493","#ff6b6b","#ffd700"][randInt(0,3)],
            type: "heart", decay: rand(0.002, 0.006), gravity: 0.01,
          });
        }
      }
    }, 200);

    setInterval(() => {
      if (st.currentStage === 4) {
        spawnConfetti(st, rand(window.innerWidth * 0.2, window.innerWidth * 0.8), rand(0, window.innerHeight * 0.3));
      }
    }, 4500);
  };

  // ===== MAIN EFFECT =====
  useEffect(() => {
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Init state
    const st: GameState = {
      currentStage: -1,
      mouseX: W() / 2, mouseY: H() / 2,
      bgStars: [], floatHearts: [], fxParticles: [],
      gameStars: [], gameSparkles: [],
      starsCaught: 0, starSpawnTimer: 0, starGameActive: false,
      fwParticles: [], fwRockets: [],
      fireworkCount: 0, fwActive: false,
      audioCtx: null, audioOn: false, melodyTimer: null,
      lastTime: performance.now(), animFrame: 0,
      finalInited: false,
    };
    stateRef.current = st;

    // Init bg stars
    for (let i = 0; i < 250; i++) {
      st.bgStars.push({
        x: rand(0, W()), y: rand(0, H()),
        r: rand(0.3, 2), phase: rand(0, Math.PI * 2),
        speed: rand(0.005, 0.025),
      });
    }

    // Resize
    const bgC = bgRef.current!;
    const fxC = fxRef.current!;
    const bgX = bgC.getContext("2d")!;
    const fxX = fxC.getContext("2d")!;

    function resizeAll() {
      bgC.width = W(); bgC.height = H();
      fxC.width = W(); fxC.height = H();
      const gm = gmRef.current;
      if (gm) { gm.width = W(); gm.height = H(); }
      const fw = fwRef.current;
      if (fw) { fw.width = W(); fw.height = H(); }
    }
    window.addEventListener("resize", resizeAll);
    resizeAll();

    // Mouse
    const onMouse = (e: MouseEvent) => { st.mouseX = e.clientX; st.mouseY = e.clientY; };
    document.addEventListener("mousemove", onMouse);

    // ===== RENDER BG =====
    function renderBg() {
      bgX.clearRect(0, 0, W(), H());
      const grad = bgX.createLinearGradient(0, 0, 0, H());
      grad.addColorStop(0, "#05000d");
      grad.addColorStop(0.4, "#0a0015");
      grad.addColorStop(0.7, "#150a28");
      grad.addColorStop(1, "#0a0015");
      bgX.fillStyle = grad;
      bgX.fillRect(0, 0, W(), H());

      st.bgStars.forEach(s => {
        s.phase += s.speed;
        const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
        bgX.globalAlpha = a;
        bgX.fillStyle = "#fff";
        bgX.beginPath();
        bgX.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgX.fill();
      });
      bgX.globalAlpha = 1;

      if (Math.random() < 0.002) {
        const sx = rand(0, W()), sy = rand(0, H() * 0.4);
        bgX.save();
        bgX.strokeStyle = "rgba(255,255,255,0.6)";
        bgX.lineWidth = 1.5;
        bgX.beginPath();
        bgX.moveTo(sx, sy);
        bgX.lineTo(sx + 80, sy + 40);
        bgX.stroke();
        bgX.restore();
      }

      if ([0, 2, 4, -1].includes(st.currentStage)) {
        if (Math.random() < 0.025) {
          st.floatHearts.push({
            x: rand(0, W()), y: H() + 20,
            s: rand(8, 22), speed: rand(0.4, 1.2),
            wobble: rand(0, Math.PI * 2),
            wobbleSpd: rand(0.008, 0.025),
            alpha: rand(0.05, 0.25),
            color: ["#ff69b4","#ff6b6b","#ffd700","#ff1493","#db7093"][randInt(0,4)],
          });
        }
        for (let i = st.floatHearts.length - 1; i >= 0; i--) {
          const h = st.floatHearts[i];
          h.y -= h.speed;
          h.wobble += h.wobbleSpd;
          drawHeart(bgX, h.x + Math.sin(h.wobble) * 25, h.y, h.s, h.color, h.alpha);
          if (h.y < -30) st.floatHearts.splice(i, 1);
        }
      }
    }

    // ===== RENDER FX =====
    function renderFx() {
      fxX.clearRect(0, 0, W(), H());
      for (let i = st.fxParticles.length - 1; i >= 0; i--) {
        const p = st.fxParticles[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
        p.life -= p.decay; p.rotation += p.rotSpeed || 0;
        if (p.wobble !== undefined && p.wobbleSpeed !== undefined) {
          p.wobble += p.wobbleSpeed;
          p.vx = Math.sin(p.wobble) * 1.5;
        }
        if (p.life <= 0) { st.fxParticles.splice(i, 1); continue; }
        fxX.save();
        if (p.type === "circle") {
          fxX.globalAlpha = p.life; fxX.fillStyle = p.color;
          fxX.beginPath(); fxX.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); fxX.fill();
        } else if (p.type === "heart") {
          drawHeart(fxX, p.x, p.y, p.size, p.color, p.life);
        } else if (p.type === "petal") {
          fxX.globalAlpha = p.life * 0.6;
          fxX.translate(p.x, p.y); fxX.rotate(p.rotation);
          fxX.fillStyle = p.color;
          fxX.beginPath(); fxX.ellipse(0, 0, p.size * 0.4, p.size, 0, 0, Math.PI * 2); fxX.fill();
        } else if (p.type === "confetti") {
          fxX.globalAlpha = p.life;
          fxX.translate(p.x, p.y); fxX.rotate(p.rotation);
          fxX.fillStyle = p.color;
          fxX.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.type === "star") {
          draw5Star(fxX, p.x, p.y, p.size * p.life, p.color, p.life);
        }
        fxX.restore();
      }
      if (st.currentStage === 2 && Math.random() < 0.04) spawnPetal(st);
    }

    // ===== STAR GAME UPDATE =====
    function updateStarGame(dt: number) {
      if (!st.starGameActive && st.starsCaught < 7) return;
      st.starSpawnTimer += dt;
      if (st.starSpawnTimer > 2 && st.gameStars.length < 4 && st.starsCaught < 7) {
        spawnGameStar(st); st.starSpawnTimer = 0;
      }
      st.gameStars.forEach(s => {
        if (!s.alive) return;
        s.y += s.speed; s.rot += s.rotSpd;
        s.glow += 0.03 * s.glowDir;
        if (s.glow > 1 || s.glow < 0) s.glowDir *= -1;
        if (s.y > H() + 50) { s.y = rand(-100, -30); s.x = rand(60, W() - 60); }
      });
      if (st.starGameActive && Math.random() < 0.3) {
        st.gameSparkles.push({ x: st.mouseX, y: st.mouseY, size: rand(1, 3), life: 1, decay: rand(0.03, 0.06), color: "#ffd700" });
      }
      for (let i = st.gameSparkles.length - 1; i >= 0; i--) {
        st.gameSparkles[i].life -= st.gameSparkles[i].decay;
        if (st.gameSparkles[i].life <= 0) st.gameSparkles.splice(i, 1);
      }
    }

    function renderStarGame() {
      const c = gmRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W(), H());
      st.gameSparkles.forEach(sp => {
        ctx.globalAlpha = sp.life; ctx.fillStyle = sp.color;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      st.gameStars.forEach(s => {
        if (!s.alive) return;
        ctx.save();
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 15 + s.glow * 15;
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.3, "#ffd700");
        gradient.addColorStop(1, "#ff8c00");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? s.r : s.r * 0.4;
          const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
          i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
                  : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      });
    }

    // ===== FIREWORKS UPDATE =====
    function updateFireworks() {
      for (let i = st.fwRockets.length - 1; i >= 0; i--) {
        const r = st.fwRockets[i];
        const dx = r.tx - r.x, dy = r.ty - r.y;
        const d = Math.hypot(dx, dy);
        if (d < 10) {
          explodeHeart(st, r.x, r.y, r.color);
          st.fwRockets.splice(i, 1);
        } else {
          r.x += (dx / d) * r.speed; r.y += (dy / d) * r.speed;
          r.trail.push({ x: r.x, y: r.y, life: 1 });
          if (r.trail.length > 15) r.trail.shift();
          r.trail.forEach(t => t.life -= 0.06);
        }
      }
      for (let i = st.fwParticles.length - 1; i >= 0; i--) {
        const p = st.fwParticles[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.99;
        p.life -= p.decay;
        if (p.life <= 0) st.fwParticles.splice(i, 1);
      }
    }

    function renderFireworks() {
      const c = fwRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "rgba(10, 0, 21, 0.15)";
      ctx.fillRect(0, 0, W(), H());
      st.fwRockets.forEach(r => {
        r.trail.forEach(t => {
          if (t.life <= 0) return;
          ctx.globalAlpha = t.life * 0.8; ctx.fillStyle = r.color;
          ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1; ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
      });
      st.fwParticles.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    // ===== GAME LOOP =====
    function gameLoop(now: number) {
      const dt = Math.min((now - st.lastTime) / 1000, 0.1);
      st.lastTime = now;
      renderBg(); renderFx();
      if (st.currentStage === 1) { updateStarGame(dt); renderStarGame(); }
      if (st.currentStage === 3) { updateFireworks(); renderFireworks(); }
      st.animFrame = requestAnimationFrame(gameLoop);
    }
    st.animFrame = requestAnimationFrame(gameLoop);

    // Init BGM Audio Element
    if (!audioRef.current && typeof Audio !== "undefined") {
      const bgm = new Audio("/audio/bgm.mp3");
      bgm.loop = true;
      bgm.volume = 0.55;
      audioRef.current = bgm;
    }

    // ===== EVENT HANDLERS =====
    const btnStart = document.getElementById("btnStart");
    const btnStartClick = () => {
      if (!st.audioCtx) st.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      st.audioOn = true;
      const audioBtn = document.getElementById("audioBtn");
      if (audioBtn) audioBtn.textContent = "🔊";
      if (st.audioCtx.state === "suspended") st.audioCtx.resume();
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      goToStage(st, 1);
    };
    btnStart?.addEventListener("click", btnStartClick);

    const btnLetter = document.getElementById("btnLetter");
    const btnLetterClick = () => goToStage(st, 3);
    btnLetter?.addEventListener("click", btnLetterClick);

    const audioBtn = document.getElementById("audioBtn");
    const audioBtnClick = () => {
      if (!st.audioCtx) st.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      st.audioOn = !st.audioOn;
      if (audioBtn) audioBtn.textContent = st.audioOn ? "🔊" : "🔇";
      if (st.audioOn) {
        if (st.audioCtx.state === "suspended") st.audioCtx.resume();
        if (audioRef.current) audioRef.current.play().catch(() => {});
      } else {
        if (audioRef.current) audioRef.current.pause();
      }
    };
    audioBtn?.addEventListener("click", audioBtnClick);

    // Star game click
    const gmCanvas = gmRef.current;
    const onStarClick = (e: MouseEvent) => {
      if (!st.starGameActive) return;
      const rect = gmCanvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (let i = st.gameStars.length - 1; i >= 0; i--) {
        const s = st.gameStars[i];
        if (!s.alive) continue;
        if (dist(mx, my, s.x, s.y) < s.r + 15) {
          s.alive = false; st.starsCaught++;
          const countEl = document.getElementById("starCount");
          if (countEl) countEl.textContent = String(st.starsCaught);
          playSfx(st, "catch");
          for (let j = 0; j < 25; j++) {
            const angle = rand(0, Math.PI * 2), spd = rand(2, 7);
            spawnFxParticle(st, s.x, s.y, {
              vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
              color: ["#ffd700","#ffec8b","#fff","#ffaa00"][randInt(0,3)],
              size: rand(2, 5), decay: rand(0.015, 0.03), type: "star", gravity: 0.05,
            });
          }
          const msgEl = document.getElementById("starMsg");
          if (msgEl) {
            msgEl.textContent = starMessages[st.starsCaught - 1];
            msgEl.classList.remove("show");
            void msgEl.offsetWidth;
            msgEl.classList.add("show");
          }
          st.gameStars.splice(i, 1);
          if (st.starsCaught >= 7) {
            st.starGameActive = false;
            gmCanvas!.style.pointerEvents = "none";
            setTimeout(() => goToStage(st, 2), 3000);
          }
          break;
        }
      }
    };
    gmCanvas?.addEventListener("click", onStarClick);

    // Fireworks click
    const fwCanvas = fwRef.current;
    const onFwClick = (e: MouseEvent) => {
      if (!st.fwActive) return;
      const rect = fwCanvas!.getBoundingClientRect();
      const tx = e.clientX - rect.left, ty = e.clientY - rect.top;
      launchRocket(st, tx, ty);
      st.fireworkCount++;
      const countEl = document.getElementById("fwCount");
      if (countEl) countEl.textContent = String(st.fireworkCount);
      if (st.fireworkCount >= 12) {
        st.fwActive = false;
        fwCanvas!.style.pointerEvents = "none";
        setTimeout(() => {
          const flash = document.getElementById("flash");
          flash?.classList.add("fire");
          setTimeout(() => flash?.classList.remove("fire"), 500);
          playSfx(st, "reveal");
          document.getElementById("sevText")?.classList.add("reveal");
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              launchRocket(st, rand(W()*0.2, W()*0.8), rand(H()*0.2, H()*0.5));
              playSfx(st, "boom");
            }, i * 300);
          }
          setTimeout(() => goToStage(st, 4), 4500);
        }, 800);
      }
    };
    fwCanvas?.addEventListener("click", onFwClick);

    // Parallax
    const onFinalParallax = (e: MouseEvent) => {
      if (st.currentStage !== 4) return;
      const frame = document.getElementById("photoFrame");
      if (!frame) return;
      const cx = W() / 2, cy = H() / 2;
      const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy;
      frame.style.transform = `rotateY(${dx * 12}deg) rotateX(${-dy * 8}deg)`;
    };
    document.addEventListener("mousemove", onFinalParallax);

    // Start!
    st.currentStage = 0;
    startIntro(st);

    return () => {
      cancelAnimationFrame(st.animFrame);
      window.removeEventListener("resize", resizeAll);
      document.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mousemove", onFinalParallax);
      btnStart?.removeEventListener("click", btnStartClick);
      btnLetter?.removeEventListener("click", btnLetterClick);
      audioBtn?.removeEventListener("click", audioBtnClick);
      gmCanvas?.removeEventListener("click", onStarClick);
      fwCanvas?.removeEventListener("click", onFwClick);
      if (audioRef.current) audioRef.current.pause();
      if (st.melodyTimer) clearTimeout(st.melodyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0015; overflow: hidden;
          width: 100vw; height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: white; user-select: none; -webkit-user-select: none;
          -webkit-font-smoothing: antialiased;
        }
        canvas.layer {
          position: fixed; top: 0; left: 0;
          width: 100%; height: 100%; pointer-events: none;
        }
        #bgCanvas { z-index: 0; }
        #fxCanvas { z-index: 5; }
        .stage {
          position: fixed; top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 10; opacity: 0; pointer-events: none;
          transition: opacity 1.2s ease;
        }
        .stage.active { opacity: 1; pointer-events: all; z-index: 30; }
        .stage:not(.active) * { pointer-events: none !important; }
        .btn-magic {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 600;
          padding: 16px 46px; border: 1.5px solid #ff69b4;
          background: rgba(255,105,180,0.06); color: #ff69b4; border-radius: 50px;
          cursor: pointer; transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
          animation: btnPulse 2.5s ease-in-out infinite;
          letter-spacing: 1.2px; position: relative; overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .btn-magic::before {
          content: ''; position: absolute; top: 50%; left: 50%;
          width: 0; height: 0; background: rgba(255,105,180,0.25);
          border-radius: 50%; transform: translate(-50%,-50%);
          transition: width 0.6s, height 0.6s;
        }
        .btn-magic:hover::before { width: 340px; height: 340px; }
        .btn-magic:hover {
          background: #ff69b4; color: #fff;
          box-shadow: 0 0 45px rgba(255,105,180,0.6), 0 0 90px rgba(255,105,180,0.3);
          transform: scale(1.08); border-color: transparent;
        }
        @keyframes btnPulse {
          0%,100% { box-shadow: 0 0 18px rgba(255,105,180,0.25); }
          50% { box-shadow: 0 0 35px rgba(255,105,180,0.6); }
        }
        .btn-hidden { opacity: 0; pointer-events: none; transition: opacity 1s ease, transform 0.5s ease; transform: translateY(20px); }
        .btn-visible { opacity: 1 !important; pointer-events: all !important; transform: translateY(0) !important; position: relative; z-index: 50; }
        
        #stage0 .intro-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: clamp(2.6rem, 6vw, 4.8rem); color: #ffb6c1;
          text-shadow: 0 0 35px rgba(255,182,193,0.4), 0 0 70px rgba(255,105,180,0.25);
          margin-bottom: 15px; min-height: 75px; text-align: center; padding: 0 20px;
          letter-spacing: 0.5px;
        }
        #stage0 .intro-subtitle {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(0.9rem, 2vw, 1.15rem);
          font-weight: 500;
          color: rgba(255, 215, 0, 0.9);
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.35);
          letter-spacing: 3.5px;
          text-transform: uppercase;
          margin-bottom: 45px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1s ease, transform 1s ease;
        }
        #stage0 .intro-subtitle.sub-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .cursor-blink {
          display: inline-block; width: 2px; height: 1em;
          background: #ffb6c1; margin-left: 4px; vertical-align: text-bottom;
          animation: blink 0.8s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        
        #stage1 { cursor: crosshair; }
        #stage1.active #gameCanvas { z-index: 12; pointer-events: all; }
        #gameCanvas { pointer-events: none; }
        .star-hud {
          position: absolute; top: 25px; right: 30px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.25rem; color: #ffd700;
          text-shadow: 0 0 15px rgba(255,215,0,0.5); z-index: 20; font-weight: 600;
          background: rgba(20, 10, 35, 0.6);
          padding: 8px 18px; border-radius: 30px;
          border: 1px solid rgba(255,215,0,0.3);
          backdrop-filter: blur(8px);
        }
        .star-msg {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%,-50%) scale(0.5);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-weight: 600;
          font-size: clamp(1.8rem, 4vw, 2.8rem); color: #ffd700;
          text-shadow: 0 0 30px rgba(255,215,0,0.7), 0 0 50px rgba(255,105,180,0.5);
          opacity: 0; z-index: 30; pointer-events: none;
          text-align: center; white-space: nowrap; transition: none;
          max-width: 90vw;
          letter-spacing: 0.5px;
        }
        .star-msg.show { animation: msgPop 2.5s ease forwards; }
        @keyframes msgPop {
          0% { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
          15% { opacity:1; transform:translate(-50%,-50%) scale(1.1); }
          25% { transform:translate(-50%,-50%) scale(1); }
          75% { opacity:1; transform:translate(-50%,-50%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-60%) scale(0.9); }
        }
        .game-hint {
          position: absolute; bottom: 35px; left: 50%;
          transform: translateX(-50%); font-size: 0.95rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: rgba(255,255,255,0.75); z-index: 20; letter-spacing: 2px;
          background: rgba(10, 0, 25, 0.5);
          padding: 7px 22px; border-radius: 20px;
          backdrop-filter: blur(5px);
        }
        
        .letter-wrap { perspective: 1000px; }
        .letter-container {
          width: min(620px, 92vw); max-height: 68vh;
          background: linear-gradient(145deg, rgba(26,10,46,0.95), rgba(45,27,78,0.95));
          border: 1px solid rgba(255,182,193,0.3); border-radius: 26px;
          padding: clamp(25px,5vw,50px);
          box-shadow: 0 0 55px rgba(255,105,180,0.2), inset 0 0 35px rgba(255,105,180,0.06);
          overflow-y: auto; position: relative; backdrop-filter: blur(12px);
          animation: letterFloat 4s ease-in-out infinite;
        }
        @keyframes letterFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .letter-container::before {
          content: '💌'; position: absolute; top: -25px; left: 50%;
          transform: translateX(-50%); font-size: 2.6rem;
          filter: drop-shadow(0 0 12px rgba(255,105,180,0.6));
        }
        .letter-line {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.25rem, 2.8vw, 1.65rem); line-height: 2.1; color: #ffb6c1;
          opacity: 0; transform: translateY(15px);
          transition: opacity 0.8s ease, transform 0.8s ease;
          letter-spacing: 0.3px;
        }
        .letter-line.show { opacity: 1; transform: translateY(0); }
        .letter-line.highlight { color: #ffd700; font-size: clamp(1.45rem, 3.2vw, 1.95rem); font-weight: 700; }
        .letter-line.signature-label { color: rgba(255,182,193,0.7); font-size: clamp(1.15rem, 2.4vw, 1.45rem); margin-top: 15px; font-style: italic; }
        .letter-line.signature-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 700;
          font-style: italic;
          font-size: clamp(1.7rem, 4vw, 2.4rem) !important;
          background: linear-gradient(45deg, #ffd700, #ff69b4, #ff8c00);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          text-shadow: 0 0 25px rgba(255,215,0,0.4);
        }
        
        #stage3 { cursor: pointer; }
        #stage3.active #fwCanvas { z-index: 12; pointer-events: all; }
        #fwCanvas { pointer-events: none; }
        .fw-hud {
          position: absolute; bottom: 30px; left: 50%;
          transform: translateX(-50%); font-size: 0.95rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: rgba(255,255,255,0.75); z-index: 20; text-align: center;
          background: rgba(10, 0, 25, 0.6);
          padding: 8px 24px; border-radius: 25px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,105,180,0.3);
        }
        .sev-text {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%,-50%) scale(0);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 700;
          font-size: clamp(3rem, 8vw, 6rem);
          background: linear-gradient(45deg, #ff6b6b, #ff69b4, #ffd700, #ff69b4);
          background-size: 300% 300%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          z-index: 25; pointer-events: none; white-space: nowrap; opacity: 0;
          text-shadow: 0 0 40px rgba(255,105,180,0.4);
          letter-spacing: 2px;
        }
        .sev-text.reveal { animation: sevReveal 3s ease forwards, gradMove 3s ease infinite; }
        @keyframes sevReveal {
          0% { opacity:0; transform:translate(-50%,-50%) scale(0) rotate(-10deg); }
          50% { opacity:1; transform:translate(-50%,-50%) scale(1.15) rotate(2deg); }
          100% { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0deg); }
        }
        @keyframes gradMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
        .final-gallery {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 15px;
          margin-bottom: 10px;
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 1.2s ease, transform 1.2s ease;
          max-width: 95vw;
        }
        .final-gallery.show {
          opacity: 1;
          transform: translateY(0);
        }
        .photo-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-glow {
          position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px;
          border-radius: 30px;
          background: radial-gradient(circle, rgba(255,105,180,0.35) 0%, transparent 70%);
          animation: glowPulse 3s ease-in-out infinite; z-index: -1;
        }
        @keyframes glowPulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }
        .photo-frame {
          width: clamp(230px, 34vw, 320px); height: clamp(280px, 42vw, 390px);
          border-radius: 22px; overflow: hidden;
          border: 2px solid rgba(255,182,193,0.5);
          box-shadow: 0 0 50px rgba(255,105,180,0.35), 0 20px 60px rgba(0,0,0,0.5);
          transform-style: preserve-3d; transition: transform 0.15s ease-out; position: relative;
          background: #150a22;
        }
        .photo-frame img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: opacity 0.3s ease;
        }
        .photo-frame .shine {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 55%, transparent 60%);
          animation: shineMove 4s ease-in-out infinite; pointer-events: none;
        }
        @keyframes shineMove { 0% { transform: translateX(-80%) translateY(-80%); } 100% { transform: translateX(80%) translateY(80%); } }

        .gallery-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(20, 10, 35, 0.75);
          border: 1px solid rgba(255, 105, 180, 0.4);
          color: #ffb6c1;
          width: 44px; height: 44px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          transition: all 0.3s;
          backdrop-filter: blur(8px);
          z-index: 25;
        }
        .gallery-nav-btn:hover {
          background: rgba(255, 105, 180, 0.3);
          color: #fff;
          transform: translateY(-50%) scale(1.15);
          box-shadow: 0 0 20px rgba(255, 105, 180, 0.6);
        }
        .gallery-nav-btn.prev { left: -60px; }
        .gallery-nav-btn.next { right: -60px; }

        @media (max-width: 600px) {
          .gallery-nav-btn.prev { left: 10px; }
          .gallery-nav-btn.next { right: 10px; }
        }

        .photo-info-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: clamp(230px, 34vw, 320px);
          margin-top: 12px;
          padding: 0 4px;
        }
        .photo-caption {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: clamp(1.1rem, 2.2vw, 1.35rem);
          color: #ffd700;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
          transition: opacity 0.3s ease;
          flex: 1;
          text-align: left;
        }
        .photo-counter {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 182, 193, 0.8);
          background: rgba(255, 105, 180, 0.15);
          border: 1px solid rgba(255, 105, 180, 0.3);
          padding: 3px 10px;
          border-radius: 12px;
          margin-left: 10px;
          white-space: nowrap;
        }

        .thumbnails-scroll {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding: 6px 10px;
          max-width: 90vw;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .photo-thumb {
          width: 52px;
          height: 62px;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          opacity: 0.5;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .photo-thumb:hover {
          opacity: 0.85;
          transform: translateY(-3px);
        }
        .photo-thumb.active {
          opacity: 1;
          border-color: #ffd700;
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
          transform: scale(1.08);
        }
        .photo-thumb img {
          width: 100%; height: 100%; object-fit: cover;
        }
        
        .final-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 700;
          font-size: clamp(2rem, 5vw, 3.2rem); text-align: center;
          background: linear-gradient(45deg, #ff69b4, #ff6b6b, #ffd700, #ff69b4);
          background-size: 300% 300%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: gradMove 3s ease infinite;
          opacity: 0; transform: translateY(20px);
          transition: opacity 1.5s ease, transform 1.5s ease; padding: 0 20px;
          letter-spacing: 0.5px;
        }
        .final-title.show { opacity: 1; transform: translateY(0); }
        
        .final-author {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: clamp(1.3rem, 3.2vw, 1.9rem);
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255,215,0,0.6);
          margin-top: 4px;
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 1.5s ease, transform 1.5s ease;
        }
        .final-author.show { opacity: 1; transform: translateY(0); }
        
        .final-sub {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem;
          color: rgba(255,182,193,0.75); margin-top: 8px; opacity: 0;
          transition: opacity 2s ease 1s;
          letter-spacing: 1.5px;
        }
        .final-sub.show { opacity: 1; }
        
        .heart-orbit {
          position: absolute; font-size: 1.6rem;
          animation: orbit 6s linear infinite; pointer-events: none;
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(190px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(190px) rotate(-360deg); }
        }
        
        .audio-btn {
          position: fixed; top: 15px; left: 15px; z-index: 100;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: white; width: 44px; height: 44px; border-radius: 50%;
          cursor: pointer; font-size: 1.2rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s; backdrop-filter: blur(8px);
        }
        .audio-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.1); }
        .flash {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: white; z-index: 50; opacity: 0; pointer-events: none;
        }
        .flash.fire { animation: flashAnim 0.4s ease-out; }
        @keyframes flashAnim { 0% { opacity: 0.35; } 100% { opacity: 0; } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,105,180,0.3); border-radius: 3px; }
        .transition-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: #0a0015; z-index: 40; opacity: 0; pointer-events: none;
          transition: opacity 0.8s ease;
        }
        .transition-overlay.active { opacity: 1; }
      `}</style>

      <canvas id="bgCanvas" className="layer" ref={bgRef} />
      <canvas id="fxCanvas" className="layer" style={{ zIndex: 5 }} ref={fxRef} />

      <button className="audio-btn" id="audioBtn" title="Toggle Sound">🔇</button>
      <div className="flash" id="flash" />
      <div className="transition-overlay" id="transOverlay" />

      {/* STAGE 0: INTRO */}
      <div id="stage0" className="stage active">
        <div className="intro-title" id="introTitle" />
        <div className="intro-subtitle" id="introSubtitle">Crafted with endless love by Julian Martin</div>
        <button className="btn-magic btn-hidden" id="btnStart">Are you ready, Gamze? 💖</button>
      </div>

      {/* STAGE 1: STAR GAME */}
      <div id="stage1" className="stage">
        <canvas id="gameCanvas" className="layer" style={{ zIndex: 12 }} ref={gmRef} />
        <div className="star-hud">⭐ <span id="starCount">0</span> / 7</div>
        <div className="star-msg" id="starMsg" />
        <div className="game-hint">✨ Click on the falling stars to catch them ✨</div>
      </div>

      {/* STAGE 2: LOVE LETTER */}
      <div id="stage2" className="stage">
        <div className="letter-wrap">
          <div className="letter-container" id="letterBox" />
        </div>
        <button className="btn-magic btn-hidden" id="btnLetter" style={{ marginTop: 30 }}>Continue 🌹</button>
      </div>

      {/* STAGE 3: FIREWORKS */}
      <div id="stage3" className="stage">
        <canvas id="fwCanvas" className="layer" style={{ zIndex: 12 }} ref={fwRef} />
        <div className="fw-hud">🎆 Tap anywhere on the screen for fireworks! &nbsp; <span id="fwCount">0</span> / 12</div>
        <div className="sev-text" id="sevText">I LOVE YOU GAMZE ❤️</div>
      </div>

      {/* STAGE 4: FINAL */}
      <div id="stage4" className="stage">
        <div className="final-title" id="finalTitle">I Love You Beyond Words, Gamze 💖</div>
        <div className="final-author" id="finalAuthor">— Forever Yours, Julian Martin 🌹</div>

        <div className="final-gallery" id="finalGallery">
          <div className="photo-container" id="photoCont">
            <div className="photo-glow" />
            <button className="gallery-nav-btn prev" id="btnPrevPhoto" title="Previous Memory">❮</button>
            <div className="photo-frame" id="photoFrame">
              <img id="mainPhoto" src="/photos/photo1.jpg" alt="Gamze Memory 💖" />
              <div className="shine" />
            </div>
            <button className="gallery-nav-btn next" id="btnNextPhoto" title="Next Memory">❯</button>
          </div>

          <div className="photo-info-bar">
            <div className="photo-caption" id="photoCaption">The moment my whole world paused for you ✨</div>
            <div className="photo-counter" id="photoCounter">1 / 11</div>
          </div>

          {/* Interactive Thumbnails Ribbon */}
          <div className="thumbnails-scroll">
            {photoList.map((p, idx) => (
              <div
                key={idx}
                className={`photo-thumb ${idx === 0 ? "active" : ""}`}
                title={`Memory ${idx + 1}`}
              >
                <img src={p.src} alt={`Thumb ${idx + 1}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="final-sub" id="finalSub">Together through every star, across infinity... 💫</div>
      </div>
    </>
  );
}

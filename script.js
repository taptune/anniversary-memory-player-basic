(() => {
  const config = window.PLAYER_CONFIG || PLAYER_CONFIG;
  const tracks = Array.isArray(config.tracks) ? config.tracks : [];

  const $ = (id) => document.getElementById(id);

  const audio = $("audio");
  const pageBg = $("pageBg");
  const artistName = $("artistName");
  const songTitle = $("songTitle");
  const songNote = $("songNote");
  const sleeve = $("sleeve");
  const record = $("record");
  const disc = $("disc");
  const coverBack = $("coverBack");
  const coverFront = $("coverFront");
  const tonearm = $("tonearm");
  const tonearmImg = $("tonearmImg");
  const playBtn = $("playBtn");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const mainBtn = $("mainBtn");
  const progressBar = $("progressBar");
  const progressFill = $("progressFill");
  const currentTime = $("currentTime");
  const duration = $("duration");
  const hintText = $("hintText");

  let currentTrackIndex = -1;
  let currentImageIndex = 0;
  let imageTimer = null;
  let changeToken = 0;
  let busy = false;
  let clickTimer = null;
  let clickCount = 0;
  let shuffledOrder = [];
  let shuffledPointer = -1;

  function withVersion(src) {
    if (!src) return "";
    const version = config.cacheVersion ? String(config.cacheVersion) : "v1";
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}v=${encodeURIComponent(version)}`;
  }

  function setBackground(src) {
    pageBg.style.setProperty("--bg-image", `url('${withVersion(src)}')`);
    sleeve.style.setProperty("--sleeve-image", `url('${withVersion(src)}')`);
  }

  function setCover(src, fade = false) {
    if (!src) return;
    const finalSrc = withVersion(src);
    setBackground(src);

    const oldSrc = coverFront.dataset.src || "";
    if (!fade || !oldSrc || oldSrc === finalSrc) {
      changeToken++;
      coverFront.classList.remove("fade-out");
      coverFront.dataset.src = finalSrc;
      coverBack.dataset.src = finalSrc;
      coverFront.style.backgroundImage = `url('${finalSrc}')`;
      coverBack.style.backgroundImage = `url('${finalSrc}')`;
      return;
    }

    const token = ++changeToken;
    coverBack.dataset.src = finalSrc;
    coverBack.style.backgroundImage = `url('${finalSrc}')`;
    coverFront.classList.add("fade-out");

    window.setTimeout(() => {
      if (token !== changeToken) return;
      coverFront.dataset.src = finalSrc;
      coverFront.style.backgroundImage = `url('${finalSrc}')`;
      coverFront.classList.remove("fade-out");
    }, 1020);
  }

  function activeTrack() {
    return tracks[currentTrackIndex] || null;
  }

  function activeImages() {
    const track = activeTrack();
    if (track && Array.isArray(track.images) && track.images.length) return track.images;
    return [config.defaultCover].filter(Boolean);
  }

  function showImage(index, fade = false) {
    const images = activeImages();
    currentImageIndex = ((index % images.length) + images.length) % images.length;
    setCover(images[currentImageIndex], fade);
  }

  function nextImage(fade = true) {
    const images = activeImages();
    if (images.length < 2 || busy) return;
    showImage(currentImageIndex + 1, fade);
    restartImageTimer();
  }

  function stopImageTimer() {
    window.clearInterval(imageTimer);
    imageTimer = null;
  }

  function restartImageTimer() {
    stopImageTimer();
    const seconds = Number(config.autoChangeImageEverySeconds || 8);
    if (!activeTrack() || audio.paused || seconds <= 0) return;
    imageTimer = window.setInterval(() => {
      if (!audio.paused && !busy) nextImage(true);
    }, seconds * 1000);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function resetProgress() {
    progressFill.style.width = "0%";
    progressBar.setAttribute("aria-valuenow", "0");
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
  }

  function updateButtons() {
    const started = currentTrackIndex >= 0;
    mainBtn.textContent = started ? "NEXT MEMORY" : (config.startButtonText || "▶ START MEMORY");
    playBtn.textContent = audio.paused ? "▶" : "Ⅱ";
  }

  function makeShuffledOrder() {
    shuffledOrder = tracks.map((_, index) => index);
    for (let i = shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]];
    }
    shuffledPointer = -1;
  }

  function nextTrackIndex() {
    if (!tracks.length) return -1;
    if (config.playOrder === "shuffle") {
      if (!shuffledOrder.length || shuffledPointer >= shuffledOrder.length - 1) makeShuffledOrder();
      shuffledPointer += 1;
      return shuffledOrder[shuffledPointer];
    }
    return currentTrackIndex < 0 ? 0 : (currentTrackIndex + 1) % tracks.length;
  }

  function previousTrackIndex() {
    if (!tracks.length) return -1;
    if (currentTrackIndex < 0) return tracks.length - 1;
    return (currentTrackIndex - 1 + tracks.length) % tracks.length;
  }

  async function safePlay() {
    try {
      await audio.play();
    } catch (error) {
      const track = activeTrack();
      songNote.textContent = track ? "Tap play to start audio" : "Tap Start Memory";
    }
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function openRecordAnimation() {
    sleeve.classList.remove("hidden");
    record.classList.add("in-sleeve");
    tonearm.classList.add("hidden");
    tonearm.classList.remove("on");
    await wait(340);
    record.classList.remove("in-sleeve");
    await wait(680);
    sleeve.classList.add("hidden");
    tonearm.classList.remove("hidden");
  }

  async function playTrack(index, shouldAutoplay = true) {
    if (busy || index < 0 || !tracks[index]) return;
    busy = true;
    mainBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    playBtn.disabled = true;

    const track = tracks[index];

    try {
      stopImageTimer();
      audio.pause();
      disc.classList.remove("playing");
      tonearm.classList.remove("on");

      currentTrackIndex = index;
      currentImageIndex = 0;
      songTitle.textContent = track.title || `Song ${index + 1}`;
      songNote.textContent = track.note || `Memory ${index + 1}`;
      showImage(0, false);
      resetProgress();

      audio.src = withVersion(track.audio);
      audio.load();

      // Start audio immediately after the user tap.
      // This is important for iPhone/Safari because delayed autoplay can be blocked.
      const playPromise = shouldAutoplay ? safePlay() : Promise.resolve();

      await openRecordAnimation();
      await playPromise;
    } finally {
      busy = false;
      mainBtn.disabled = false;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      playBtn.disabled = false;
      updateButtons();
    }
  }

  function togglePlayPause() {
    if (!activeTrack()) {
      playTrack(nextTrackIndex(), true);
      return;
    }
    if (audio.paused) safePlay();
    else audio.pause();
  }

  function init() {
    document.title = `${config.artistName || "Anniversary"} Player`;
    artistName.textContent = config.artistName || "OUR MOMENTS";
    songTitle.textContent = config.startTitle || "Our Anniversary";
    songNote.textContent = config.startNote || "SCAN • TAP • REMEMBER";
    mainBtn.textContent = config.startButtonText || "▶ START MEMORY";

    if (config.tonearmImage) tonearmImg.src = withVersion(config.tonearmImage);
    setCover(config.defaultCover || (tracks[0] && tracks[0].images && tracks[0].images[0]), false);

    // Preload images so switching feels smoother.
    [config.defaultCover, ...(tracks.flatMap((track) => track.images || []))]
      .filter(Boolean)
      .forEach((src) => {
        const img = new Image();
        img.src = withVersion(src);
      });

    if (!tracks.length) {
      songTitle.textContent = "Add songs in config.js";
      songNote.textContent = "No tracks found";
      mainBtn.disabled = true;
      playBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  mainBtn.addEventListener("click", () => playTrack(nextTrackIndex(), true));
  nextBtn.addEventListener("click", () => playTrack(nextTrackIndex(), true));
  prevBtn.addEventListener("click", () => playTrack(previousTrackIndex(), true));
  playBtn.addEventListener("click", togglePlayPause);

  record.addEventListener("click", () => {
    clickCount += 1;
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      if (clickCount === 1) togglePlayPause();
      if (clickCount >= 2) nextImage(true);
      clickCount = 0;
    }, 235);
  });

  audio.addEventListener("play", () => {
    disc.classList.add("playing");
    tonearm.classList.add("on");
    updateButtons();
    restartImageTimer();
  });

  audio.addEventListener("pause", () => {
    disc.classList.remove("playing");
    tonearm.classList.remove("on");
    updateButtons();
    stopImageTimer();
  });

  audio.addEventListener("ended", () => {
    playTrack(nextTrackIndex(), true);
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percent = Math.max(0, Math.min(100, (audio.currentTime / audio.duration) * 100));
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(Math.round(percent)));
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("error", () => {
    const track = activeTrack();
    songNote.textContent = track ? `Audio missing: ${track.audio}` : "Audio file missing";
  });

  progressBar.addEventListener("click", (event) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * percent));
  });

  hintText.addEventListener("click", () => nextImage(true));
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  init();
})();

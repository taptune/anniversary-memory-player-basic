(() => {
  const config = window.PLAYER_CONFIG || PLAYER_CONFIG;
  const tracks = Array.isArray(config.tracks) ? config.tracks : [];
  const $ = (id) => document.getElementById(id);

  const audio = $("audio");
  const pageBg = $("pageBg");
  const artistName = $("artistName");
  const songTitle = $("songTitle");
  const songNote = $("songNote");
  const sleeveBack = $("sleeveBack");
  const sleeveFront = $("sleeveFront");
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
  const sleeveSmallText = $("sleeveSmallText");
  const sleeveBigText = $("sleeveBigText");

  let currentTrackIndex = -1;
  let currentImageIndex = 0;
  let imageTimer = null;
  let changeToken = 0;
  let imageTransitioning = false;
  const imageTransitionMs = 1050;
  let busy = false;
  let clickTimer = null;
  let clickCount = 0;
  let shuffledOrder = [];
  let shuffledPointer = -1;

  // V10: audio starts only after the animation is done, so the progress bar stays frozen.
  let suppressPlaybackUI = false;
  let progressLocked = false;
  let needleToken = 0;
  let stageOpened = false;

  function withVersion(src) {
    if (!src) return "";
    const version = config.cacheVersion ? String(config.cacheVersion) : "v1";
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}v=${encodeURIComponent(version)}`;
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function textFor(key, fallback) {
    const siteText = config.siteText || {};
    // This keeps older config files working too.
    return siteText[key] ?? config[key] ?? fallback;
  }

  function sleeveElements() {
    return [sleeveBack, sleeveFront].filter(Boolean);
  }

  function setSleevesLeft(isLeft) {
    sleeveElements().forEach((el) => el.classList.toggle("left", isLeft));
    record.classList.toggle("left", isLeft);
  }

  function showSleeves() {
    sleeveElements().forEach((el) => el.classList.remove("hidden"));
  }

  function setSleevesParked(isParked) {
    sleeveElements().forEach((el) => el.classList.toggle("parked", isParked));
  }

  function hideSleeves() {
    sleeveElements().forEach((el) => el.classList.add("hidden"));
  }

  function needleInstantRest() {
    needleToken += 1;
    tonearm.classList.remove("on", "lifted");
  }

  async function needleToPlay() {
    const token = ++needleToken;
    // V10: no translate / no jump. The fixed base stays in place; only rotation changes.
    tonearm.classList.add("on");
    await wait(620);
    if (token !== needleToken) return;
    tonearm.classList.remove("lifted");
  }

  async function needleToRest() {
    const token = ++needleToken;
    tonearm.classList.remove("on");
    await wait(620);
    if (token !== needleToken) return;
    tonearm.classList.remove("lifted");
  }

  async function needleReCueOnRecord() {
    const token = ++needleToken;
    // Keep the base fixed and avoid the jumping lift effect during song changes.
    tonearm.classList.add("on");
    await wait(260);
    if (token !== needleToken) return;
    tonearm.classList.remove("lifted");
  }

  function resetClosedSleeve() {
    showSleeves();
    setSleevesParked(false);
    setSleevesLeft(false);
    record.classList.add("inside");
    needleInstantRest();
    stageOpened = false;
  }

  function keepStageOpen() {
    // V12: keep the sleeve visible, parked on the left.
    // It should not come back to the middle or disappear when changing songs.
    showSleeves();
    setSleevesLeft(true);
    setSleevesParked(true);
    record.classList.remove("inside", "left");
    stageOpened = true;
  }

  function setBackground(src) {
    const versioned = withVersion(src);
    pageBg.style.setProperty("--bg-image", `url('${versioned}')`);
    sleeveFront.style.setProperty("--sleeve-image", `url('${versioned}')`);
  }

  function setCover(src, fade = false) {
    if (!src) return false;

    // V12: block image spam while the fade animation is still running.
    // This stops rapid double-taps from making the cover transition jump.
    if (fade && imageTransitioning) return false;

    const finalSrc = withVersion(src);
    setBackground(src);

    const oldSrc = coverFront.dataset.src || "";
    if (!fade || !oldSrc || oldSrc === finalSrc) {
      changeToken++;
      imageTransitioning = false;
      coverFront.classList.remove("fade-out");
      coverFront.dataset.src = finalSrc;
      coverBack.dataset.src = finalSrc;
      coverFront.style.backgroundImage = `url('${finalSrc}')`;
      coverBack.style.backgroundImage = `url('${finalSrc}')`;
      return true;
    }

    const token = ++changeToken;
    imageTransitioning = true;
    coverBack.dataset.src = finalSrc;
    coverBack.style.backgroundImage = `url('${finalSrc}')`;
    coverFront.classList.add("fade-out");

    window.setTimeout(() => {
      if (token !== changeToken) return;
      coverFront.dataset.src = finalSrc;
      coverFront.style.backgroundImage = `url('${finalSrc}')`;
      coverFront.classList.remove("fade-out");
      imageTransitioning = false;
    }, imageTransitionMs);

    return true;
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
    const nextIndex = ((index % images.length) + images.length) % images.length;
    const changed = setCover(images[nextIndex], fade);
    if (changed) currentImageIndex = nextIndex;
    return changed;
  }

  function nextImage(fade = true) {
    const images = activeImages();
    if (images.length < 2 || busy || imageTransitioning) return;
    const changed = showImage(currentImageIndex + 1, fade);
    if (changed) restartImageTimer();
  }

  function stopImageTimer() {
    window.clearInterval(imageTimer);
    imageTimer = null;
  }

  function restartImageTimer() {
    stopImageTimer();
    const seconds = Number(config.autoChangeImageEverySeconds || 8);
    if (!activeTrack() || audio.paused || audio.muted || seconds <= 0 || progressLocked) return;
    imageTimer = window.setInterval(() => {
      if (!audio.paused && !audio.muted && !busy && !progressLocked) nextImage(true);
    }, seconds * 1000);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setProgressAtStart() {
    progressFill.style.width = "0%";
    progressBar.setAttribute("aria-valuenow", "0");
    currentTime.textContent = "0:00";
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      duration.textContent = formatTime(audio.duration);
    }
  }

  function resetProgress() {
    progressFill.style.width = "0%";
    progressBar.setAttribute("aria-valuenow", "0");
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
  }

  function updateProgressUI() {
    if (progressLocked || suppressPlaybackUI || audio.muted) {
      setProgressAtStart();
      return;
    }

    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percent = Math.max(0, Math.min(100, (audio.currentTime / audio.duration) * 100));
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(Math.round(percent)));
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
  }

  function updateButtons() {
    const started = currentTrackIndex >= 0;
    mainBtn.textContent = started ? textFor("nextMemoryButtonText", "NEXT MEMORY") : textFor("startButtonText", "▶ START MEMORY");
    if (playBtn) playBtn.textContent = audio.paused || audio.muted || progressLocked ? "▶" : "Ⅱ";
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

  async function safePlay(options = {}) {
    try {
      if (typeof options.muted === "boolean") audio.muted = options.muted;
      await audio.play();
      return true;
    } catch (error) {
      const track = activeTrack();
      audio.muted = false;
      suppressPlaybackUI = false;
      progressLocked = false;
      songNote.textContent = track ? textFor("tapToStartAudioText", "Tap play to start audio") : textFor("tapStartMemoryText", "Tap Start Memory");
      return false;
    }
  }

  async function sleevePullOutAnimation() {
    // Start state: sleeve closed in the middle, record/tape hidden inside, needle points down.
    resetClosedSleeve();
    await wait(220);

    // Step 1: the sleeve moves left first.
    setSleevesLeft(true);
    await wait(760);

    // Step 2: the record/tape is pulled out from the left sleeve into the center.
    record.classList.remove("inside");
    record.classList.remove("left");
    await wait(900);

    // V12: keep the sleeve parked on the left. Do not hide it.
    showSleeves();
    setSleevesLeft(true);
    setSleevesParked(true);
    stageOpened = true;
    await wait(120);
  }

  async function makeAudioAudibleAfterAnimation(startedMuted) {
    // Keep it visually at zero until the full animation + needle drop is finished.
    setProgressAtStart();

    if (startedMuted && !audio.paused) {
      try { audio.currentTime = 0; } catch (error) {}
      audio.muted = false;
    } else {
      try { audio.currentTime = 0; } catch (error) {}
      await safePlay({ muted: false });
    }

    suppressPlaybackUI = false;
    progressLocked = false;
    updateProgressUI();

    if (!audio.paused && !audio.muted) {
      disc.classList.add("playing");
      restartImageTimer();
    }

    updateButtons();
  }

  async function playTrack(index, shouldAutoplay = true) {
    if (busy || index < 0 || !tracks[index]) return;
    busy = true;
    mainBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    if (playBtn) playBtn.disabled = true;

    const track = tracks[index];
    const useIntroAnimation = !stageOpened;
    const wasNeedleOnRecord = tonearm.classList.contains("on");

    try {
      stopImageTimer();
      audio.pause();
      audio.muted = false;
      suppressPlaybackUI = false;
      progressLocked = false;
      disc.classList.remove("playing");

      if (useIntroAnimation) {
        needleInstantRest();
      } else {
        keepStageOpen();
      }

      currentTrackIndex = index;
      currentImageIndex = 0;
      songTitle.textContent = track.title || `Song ${index + 1}`;
      songNote.textContent = track.note || `Memory ${index + 1}`;
      showImage(0, !useIntroAnimation);
      resetProgress();

      audio.src = withVersion(track.audio);
      audio.load();
      try { audio.currentTime = 0; } catch (error) {}

      // Freeze the visible progress during the intro / track-change animation.
      progressLocked = true;
      suppressPlaybackUI = true;
      setProgressAtStart();

      // v7: do NOT start audio, even muted, during the animation.
      // This keeps the white progress bar frozen at 0:00 until the sleeve + needle motion is finished.
      if (useIntroAnimation) {
        await sleevePullOutAnimation();
        stageOpened = true;
        await needleToPlay();
      } else if (shouldAutoplay) {
        if (wasNeedleOnRecord) {
          await needleReCueOnRecord();
        } else {
          await needleToPlay();
        }
      }

      if (shouldAutoplay) {
        keepStageOpen();
        await makeAudioAudibleAfterAnimation(false);
      } else {
        suppressPlaybackUI = false;
        progressLocked = false;
        setProgressAtStart();
      }
    } finally {
      busy = false;
      mainBtn.disabled = false;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      if (playBtn) playBtn.disabled = false;
      updateButtons();
    }
  }

  async function startExistingTrack() {
    if (busy) return;

    // V11: resume immediately.
    // The needle animation should follow the audio, not block it.
    progressLocked = false;
    suppressPlaybackUI = false;

    const started = await safePlay({ muted: false });
    if (started) {
      disc.classList.add("playing");
      restartImageTimer();
      needleToPlay(); // do not await; this removes the short delay before audio resumes
    }

    updateButtons();
  }

  function pauseExistingTrack() {
    if (busy) return;

    // V11: pause immediately, then let the needle return without locking the player.
    audio.pause();
    disc.classList.remove("playing");
    stopImageTimer();
    needleToRest(); // do not await; tapping play can interrupt this and swing back in
    updateButtons();
  }

  function togglePlayPause() {
    if (!activeTrack()) {
      playTrack(nextTrackIndex(), true);
      return;
    }
    if (audio.paused) startExistingTrack();
    else pauseExistingTrack();
  }

  function init() {
    document.title = textFor("browserTitle", "Anniversary Memory Player");
    artistName.textContent = textFor("artistName", "OUR MOMENTS");
    songTitle.textContent = textFor("startTitle", "Our Anniversary");
    songNote.textContent = textFor("startNote", "SCAN • TAP • REMEMBER");
    mainBtn.textContent = textFor("startButtonText", "▶ START MEMORY");
    prevBtn.textContent = textFor("prevButtonText", "PREV");
    nextBtn.textContent = textFor("nextButtonText", "NEXT");
    hintText.textContent = textFor("bottomHint", "Single Tap = Play/Pause  Double Tap = Image change");
    if (sleeveSmallText) sleeveSmallText.textContent = textFor("sleeveSmallText", "MEMORY");
    if (sleeveBigText) sleeveBigText.textContent = textFor("sleeveBigText", "LP");

    if (config.tonearmImage) tonearmImg.src = withVersion(config.tonearmImage);
    setCover(config.defaultCover || (tracks[0] && tracks[0].images && tracks[0].images[0]), false);

    // Initial screen: sleeve is closed; tape/record is inside; needle points down.
    resetClosedSleeve();
    resetProgress();

    [config.defaultCover, ...(tracks.flatMap((track) => track.images || []))]
      .filter(Boolean)
      .forEach((src) => {
        const img = new Image();
        img.src = withVersion(src);
      });

    if (!tracks.length) {
      songTitle.textContent = textFor("noTracksTitle", "Add songs in config.js");
      songNote.textContent = textFor("noTracksNote", "No tracks found");
      mainBtn.disabled = true;
      if (playBtn) playBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  mainBtn.addEventListener("click", () => playTrack(nextTrackIndex(), true));
  nextBtn.addEventListener("click", () => playTrack(nextTrackIndex(), true));
  prevBtn.addEventListener("click", () => playTrack(previousTrackIndex(), true));
  if (playBtn) playBtn.addEventListener("click", togglePlayPause);

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
    if (!suppressPlaybackUI && !audio.muted && !progressLocked) {
      disc.classList.add("playing");
      restartImageTimer();
    }
    updateButtons();
  });

  audio.addEventListener("pause", () => {
    if (!progressLocked) {
      disc.classList.remove("playing");
      stopImageTimer();
    }
    updateButtons();
  });

  audio.addEventListener("ended", () => {
    playTrack(nextTrackIndex(), true);
  });

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      duration.textContent = formatTime(audio.duration);
    }
    if (progressLocked || suppressPlaybackUI || audio.muted) setProgressAtStart();
  });

  audio.addEventListener("timeupdate", updateProgressUI);

  audio.addEventListener("error", () => {
    const track = activeTrack();
    songNote.textContent = track ? `${textFor("audioMissingPrefix", "Audio missing:")} ${track.audio}` : textFor("audioMissingPrefix", "Audio missing:");
    suppressPlaybackUI = false;
    progressLocked = false;
  });

  progressBar.addEventListener("click", (event) => {
    if (progressLocked || suppressPlaybackUI || audio.muted) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * percent));
  });

  hintText.addEventListener("click", () => nextImage(true));
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  init();
})();

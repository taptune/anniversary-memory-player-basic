/*
  BASIC ANNIVERSARY PLAYER CONFIG

  EDIT WORDS HERE:
  Most of the website text is inside siteText below.
  Example: change "OUR MOMENTS" to your brand name, couple name, or anything else.

  File names stay the same unless you also change the paths below:
  audio/song1.mp3
  audio/song2.mp3

  images/song1-image1.png
  images/song1-image2.png
  images/song2-image1.png
  images/song2-image2.png
*/

const PLAYER_CONFIG = {
  cacheVersion: "v12", // Change to v13, v14, etc. after replacing files online.

  siteText: {
    browserTitle: "Anniversary Memory Player",

    // Top words before any song starts
    artistName: "OUR MOMENTS",
    startTitle: "Our Anniversary",
    startNote: "SCAN • TAP • REMEMBER",

    // Button words
    startButtonText: "▶ START MEMORY",
    nextMemoryButtonText: "NEXT MEMORY",
    prevButtonText: "PREV",
    nextButtonText: "NEXT",

    // Words printed on the sleeve
    sleeveSmallText: "MEMORY",
    sleeveBigText: "LP",

    // Small words at the bottom
    bottomHint: "Single Tap = Play/Pause  Double Tap = Image change",

    // Error / empty state words
    noTracksTitle: "Add songs in config.js",
    noTracksNote: "No tracks found",
    tapToStartAudioText: "Tap play to start audio",
    tapStartMemoryText: "Tap Start Memory",
    audioMissingPrefix: "Audio missing:"
  },

  // sequence = Song 1 then Song 2. shuffle = random order.
  playOrder: "sequence",

  // Each song has 2 images. The image will switch automatically while playing.
  autoChangeImageEverySeconds: 8,

  defaultCover: "images/song1-image1.png",
  tonearmImage: "images/tonearm.png",

  tracks: [
    {
      title: "Song 1",
      note: "Memory 01",
      audio: "audio/song1.mp3",
      images: [
        "images/song1-image1.png",
        "images/song1-image2.png"
      ]
    },
    {
      title: "Song 2",
      note: "Memory 02",
      audio: "audio/song2.mp3",
      images: [
        "images/song2-image1.png",
        "images/song2-image2.png"
      ]
    }
  ]
};

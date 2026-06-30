/*
  BASIC ANNIVERSARY PLAYER CONFIG

  The easiest way to manage this project:
  1. Replace files in the folders, but keep the same names.
  2. Only edit this file for text or more songs.
  3. When you replace audio/images on GitHub Pages, change cacheVersion to a new value.

  Current file names:
  audio/song1.mp3
  audio/song2.mp3

  images/song1-image1.png
  images/song1-image2.png
  images/song2-image1.png
  images/song2-image2.png
*/

const PLAYER_CONFIG = {
  cacheVersion: "v8", // Change to v2, v3, etc. after replacing files online.

  artistName: "OUR MOMENTS",
  startTitle: "Our Anniversary",
  startNote: "SCAN • TAP • REMEMBER",
  startButtonText: "▶ START MEMORY",

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

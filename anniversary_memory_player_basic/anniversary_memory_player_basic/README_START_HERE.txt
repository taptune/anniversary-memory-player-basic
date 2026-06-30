ANNIVERSARY MEMORY PLAYER - EASY VERSION

FAST WAY TO USE IT
1. Open the folder.
2. Replace the files, but keep the exact same file names.
3. Upload the whole folder to GitHub Pages.

AUDIO FILES
Put your music here:

audio/song1.mp3
audio/song2.mp3

IMAGE FILES
Put your images here:

images/song1-image1.png
images/song1-image2.png
images/song2-image1.png
images/song2-image2.png

CURRENT IMAGE MATCHING
song1-image1.png = night city walk
song1-image2.png = sunset beach walk
song2-image1.png = outdoor night cuddle
song2-image2.png = indoor cozy cuddle

ONLY EDIT THIS FILE FOR TEXT
config.js

In config.js you can change:
- artistName
- startTitle
- song titles
- song notes
- image switching time
- playOrder: sequence or shuffle

GITHUB PAGES CACHE FIX
When you replace audio or images online, open config.js and change:
cacheVersion: "v1"

to something new, for example:
cacheVersion: "v2"

Then upload again.

IPHONE / SAFARI NOTE
iPhone usually blocks autoplay. This player is made for that:
The visitor taps START MEMORY first, then audio can play.

CONTROLS
START MEMORY = start the first song
NEXT = next song
PREV = previous song
Play button = play / pause
Single tap record = play / pause
Double tap record = change image
Progress bar = jump to a time in the song

DO NOT DELETE
images/tonearm.png
index.html
style.css
script.js
config.js

#!/bin/bash
cd "$(dirname "$0")"

# Ajouter bin/ au PATH pour yt-dlp local
export PATH="$PWD/bin:$PATH"
export PORT=${PORT:-10000}

echo "🔍 [START] PATH=$PATH"
echo "🔍 [START] yt-dlp: $(which yt-dlp || echo 'absent')"
echo "🔍 [START] ffmpeg: $(which ffmpeg || echo 'absent')"
echo "🔍 [START] edge-tts: $(which edge-tts || echo 'absent')"

echo "🚀 Démarrage MARCO-XMD sur le port $PORT"
exec node index.js

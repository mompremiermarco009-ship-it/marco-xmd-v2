#!/bin/bash

echo "🚀 Build MARCO-XMD pour Render"
echo "================================"

# 1. Dépendances Node
echo "📦 Installation des dépendances Node..."
npm install --omit=dev

# 2. Dépendances Python (edge-tts + yt-dlp)
echo "🐍 Installation des dépendances Python..."
pip3 install --no-cache-dir --break-system-packages edge-tts yt-dlp || \
pip install --no-cache-dir edge-tts yt-dlp || \
echo "⚠️ Impossible d'installer les paquets Python"

# 3. Télécharger aussi yt-dlp dans bin/ (fallback)
echo "⬇️  Téléchargement de yt-dlp (fallback)..."
mkdir -p bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp 2>/dev/null && \
chmod +x bin/yt-dlp && \
echo "✅ yt-dlp binaire téléchargé" || \
echo "⚠️ Échec téléchargement yt-dlp binaire"

# 4. Vérifications
echo ""
echo "================================"
echo "✅ Build terminé"
echo "================================"
echo "Node : $(node --version)"
echo "Python : $(python3 --version)"
echo "yt-dlp PATH : $(which yt-dlp || echo 'absent')"
echo "yt-dlp binaire : $([ -f bin/yt-dlp ] && echo 'présent' || echo 'absent')"
echo "edge-tts : $(which edge-tts || echo 'absent')"
echo "ffmpeg : $(which ffmpeg || echo 'absent')"

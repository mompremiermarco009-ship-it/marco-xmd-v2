#!/bin/bash
cd "$(dirname "$0")"

# Installer les dépendances Node si nécessaire
[ ! -d "node_modules" ] && npm install --omit=dev

# Installer les dépendances Python si nécessaire
if [ -f "requirements.txt" ]; then
    python3 -m pip install --quiet -r requirements.txt 2>/dev/null || \
    pip install --quiet -r requirements.txt 2>/dev/null || \
    echo "⚠️ Impossible d'installer les dépendances Python"
fi

# Ajouter le binaire yt-dlp local au PATH
export PATH="$PWD/bin:$PATH"
export PORT=${PORT:-10000}

echo "🚀 Démarrage MARCO-XMD sur le port $PORT"
node index.js

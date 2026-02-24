#!/bin/bash
# Habitaris Suite - Launcher
# Doble clic en este archivo para abrir la app

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "🏠 Iniciando Habitaris Suite..."

# Verificar node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    echo "Ve a nodejs.org, descarga e instala Node.js, luego vuelve a ejecutar este archivo."
    read -p "Presiona Enter para salir..."
    exit 1
fi

# Instalar si no existe node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias (solo la primera vez)..."
    npm install
fi

echo "🚀 Abriendo en el navegador..."
npm run dev &
sleep 3
open http://localhost:5173

echo "✅ Habitaris Suite corriendo en http://localhost:5173"
echo "Para detener: cierra esta ventana o presiona Ctrl+C"
wait

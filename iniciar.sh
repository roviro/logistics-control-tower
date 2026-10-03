#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "======================================================="
echo "   🚀 LOGISTICS CONTROL TOWER - INICIALIZAÇÃO"
echo "======================================================="

# Checar se bun está no PATH
if ! command -v bun &> /dev/null; then
  export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
fi

# Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências..."
  bun install
fi

# Compilar frontend
echo "🔨 Compilando aplicação..."
bun run build

# Subir servidor
echo "🌐 Iniciando servidor em http://localhost:3333"
bun run src/server/index.ts

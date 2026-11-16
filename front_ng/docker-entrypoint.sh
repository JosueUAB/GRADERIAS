#!/bin/sh
set -e

# Valores por defecto si no se proporcionan por variables de entorno
API_URL="${API_URL:-http://localhost:8000/api}"
AVATAR_URL="${AVATAR_URL:-http://localhost:8000/images}"

echo "[Front Entrypoint] Configurando variables de entorno en tiempo de ejecución..."
echo "[Front Entrypoint] API_URL: ${API_URL}"
echo "[Front Entrypoint] AVATAR_URL: ${AVATAR_URL}"

# Generar assets/env.js con los valores inyectados
ENV_FILE="/usr/share/nginx/html/assets/env.js"

mkdir -p /usr/share/nginx/html/assets

cat <<EOF > "$ENV_FILE"
(function (window) {
    window.__env = window.__env || {};
    window.__env.apiUrl = '${API_URL}';
    window.__env.avatarUrl = '${AVATAR_URL}';
})(this);
EOF

echo "[Front Entrypoint] Archivo ${ENV_FILE} generado exitosamente."

# Ejecutar el comando principal (nginx)
exec "$@"

#!/bin/sh
set -e

echo "[Backend Entrypoint] Iniciando contenedor Laravel 12..."

cd /var/www/html

# 1. Asegurar archivo .env
if [ ! -f .env ]; then
    echo "[Backend Entrypoint] No se encontró .env, copiando desde .env.example..."
    cp .env.example .env
fi

# 2. Permisos en storage y bootstrap/cache
echo "[Backend Entrypoint] Ajustando permisos de almacenamiento..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 3. Esperar a que la base de datos MySQL esté disponible
DB_HOST="${DB_HOST:-graderias_db}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-back_graderias}"
DB_USERNAME="${DB_USERNAME:-graderias_user}"
DB_PASSWORD="${DB_PASSWORD:-graderias_pass}"

echo "[Backend Entrypoint] Esperando conexión a MySQL en ${DB_HOST}:${DB_PORT}..."
MAX_TRIES=30
COUNT=0
until php -r "
    try {
        new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');
        exit(0);
    } catch (Exception \$e) {
        exit(1);
    }
" 2>/dev/null; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        echo "[Backend Entrypoint] ERROR: No se pudo conectar a MySQL tras $MAX_TRIES intentos."
        break
    fi
    echo "[Backend Entrypoint] MySQL no está listo aún ($COUNT/$MAX_TRIES). Reintentando en 2 segundos..."
    sleep 2
done

if [ $COUNT -lt $MAX_TRIES ]; then
    echo "[Backend Entrypoint] Conexión a MySQL establecida correctamente."
fi

# 4. Generar APP_KEY si está vacía
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null && [ -z "$APP_KEY" ]; then
    echo "[Backend Entrypoint] Generando clave de aplicación (APP_KEY)..."
    php artisan key:generate --force
fi

# 5. Enlace simbólico de Storage
echo "[Backend Entrypoint] Verificando storage:link..."
php artisan storage:link || true

# 6. Migraciones de Base de Datos
echo "[Backend Entrypoint] Ejecutando migraciones de base de datos..."
php artisan migrate --force

# 7. Ejecutar seeders si se solicita explícitamente o si la tabla users está vacía
if [ "$RUN_SEEDERS" = "true" ]; then
    echo "[Backend Entrypoint] RUN_SEEDERS=true detectado. Ejecutando seeders..."
    php artisan db:seed --force
else
    # Comprobar si hay usuarios en la base de datos
    USER_COUNT=$(php -r "
        try {
            \$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');
            \$stmt = \$pdo->query('SELECT COUNT(*) FROM users');
            echo \$stmt ? \$stmt->fetchColumn() : 0;
        } catch (Exception \$e) {
            echo 0;
        }
    " 2>/dev/null || echo 0)

    if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
        echo "[Backend Entrypoint] Base de datos vacía. Ejecutando seeders iniciales..."
        php artisan db:seed --force
    fi
fi

# 8. Limpiar y optimizar cachés
echo "[Backend Entrypoint] Limpiando cachés de Laravel..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

if [ "$APP_ENV" = "production" ]; then
    echo "[Backend Entrypoint] Modo producción: Optimizando cachés..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

echo "[Backend Entrypoint] Laravel listo. Arrancando Supervisor (Nginx + PHP-FPM + Queue)..."
exec "$@"

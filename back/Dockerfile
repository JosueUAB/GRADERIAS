# =========================================================================
# Dockerfile Backend - Laravel 12 (PHP 8.4-FPM + Nginx + Supervisor)
# =========================================================================
FROM php:8.4-fpm-alpine

# Instalar paquetes del sistema necesarios
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    mariadb-client

# Configurar e instalar extensiones de PHP requeridas por Laravel, DomPDF y QR Codes
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Instalar Composer oficial
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configurar directorio de trabajo
WORKDIR /var/www/html

# Copiar definiciones de dependencias de Composer
COPY composer.json composer.lock ./

# Instalar dependencias de producción
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copiar el código fuente completo del backend
COPY . .

# Generar autoloader optimizado
RUN composer dump-autoload --optimize

# Copiar configuraciones personalizadas de Nginx, PHP y Supervisor
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# Crear directorios de logs y ajustar permisos
RUN mkdir -p /var/log/supervisor /var/log/nginx /var/www/html/storage /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

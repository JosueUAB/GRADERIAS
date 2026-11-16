# =========================================================================
# FASE 1: Construcción del Frontend Angular (Node.js LTS)
# =========================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias con caché optimizado
RUN npm install --prefer-offline --no-audit

# Copiar el código fuente completo
COPY . .

# Compilar Angular para producción
RUN npm run build

# =========================================================================
# FASE 2: Servidor Web Nginx de Producción
# =========================================================================
FROM nginx:1.27-alpine

# Eliminar configuración y archivos web por defecto
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos compilados desde el builder (Angular 21 emite a dist/sakai-ng/browser)
COPY --from=builder /app/dist/sakai-ng/browser /usr/share/nginx/html

# Copiar el script de entrada para inyección dinámica de variables de entorno
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

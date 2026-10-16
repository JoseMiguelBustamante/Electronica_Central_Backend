# API image with nginx on :80 (Traefik/Dokploy pattern used by other apps on this VPS).
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache nginx \
  && mkdir -p /run/nginx \
  && printf 'server {\n  listen 80;\n  location / {\n    proxy_pass http://127.0.0.1:3001;\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n  }\n}\n' > /etc/nginx/http.d/default.conf

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 80

# Dokploy injects env; createEnvFile also writes .env for local tooling.
CMD ["sh", "-c", "node index.js & exec nginx -g 'daemon off;'"]

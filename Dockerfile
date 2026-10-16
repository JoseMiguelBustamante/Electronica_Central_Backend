# Production API image. Listens on :80 so Traefik/Dokploy can reach it
# the same way as other apps on this VPS.
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

CMD ["node", "index.js"]

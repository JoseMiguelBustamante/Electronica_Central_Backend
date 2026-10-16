# Production API image. Env vars come from Dokploy (createEnvFile writes .env).
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Dokploy injects env vars into the process; do not require a local .env file.
CMD ["node", "index.js"]

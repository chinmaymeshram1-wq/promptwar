# syntax=docker/dockerfile:1
# EcoPilot container for Google Cloud Run (or any OCI host). Listens on $PORT (default 8080).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Public Firebase web config is baked into the client bundle at build time (optional).
ARG VITE_FIREBASE_CONFIG=""
ENV VITE_FIREBASE_CONFIG=$VITE_FIREBASE_CONFIG
RUN npm run build && npm run build:server

FROM node:22-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY vercel.json ./
# Run as the unprivileged user that ships with the Node image.
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/standalone.js"]

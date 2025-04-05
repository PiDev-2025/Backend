FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Optimiser npm install
RUN npm ci --only=production --no-audit --no-optional

COPY . .
RUN npm run build && npm prune --production

FROM node:18-alpine
WORKDIR /app
# Copier seulement les fichiers nécessaires
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Ajouter des optimisations système
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production

# Cleanup
RUN npm cache clean --force && \
    rm -rf /tmp/*

EXPOSE 3001
CMD ["npm", "start"]

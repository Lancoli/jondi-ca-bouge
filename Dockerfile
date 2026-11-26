FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4021
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit
COPY . .
EXPOSE 4021
CMD ["node", "server.js"]

FROM node:22-alpine

WORKDIR /app

# Prvo samo manifesti — Docker keš ostaje validan dok se zavisnosti ne menjaju
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Ne pokrećemo kao root
USER node

CMD ["node", "src/index.js"]

FROM node:22-alpine
WORKDIR /app
COPY signaling.mjs package.json ./
RUN npm install --production
EXPOSE 3010
CMD ["node", "signaling.mjs"]

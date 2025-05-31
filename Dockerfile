FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV production
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
EXPOSE 3002
CMD ["node", "app.js"]
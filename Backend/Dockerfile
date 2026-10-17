FROM node:20-alpine

WORKDIR /app

# Copy package descriptors first to take advantage of Docker layer caching
COPY package*.json ./

RUN npm install

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

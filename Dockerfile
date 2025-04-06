FROM node:18-alpine

WORKDIR /app

# Copy only package files first
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY .env ./

# Other configuration files if needed
COPY tsconfig*.json ./ || true
COPY jest.config.js ./ || true

EXPOSE 3001
CMD ["npm", "start"]

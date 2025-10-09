FROM node:22-slim

# Set working directory inside container
WORKDIR /app

# Copy package.json & lock
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Expose port
EXPOSE 3000

# Start API
CMD ["node", "app.js"]

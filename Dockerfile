# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose Vite's default dev server port
EXPOSE 5173

# Start Vite in dev mode
CMD ["npm", "run", "dev", "--", "--host"]

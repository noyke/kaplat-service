# Use the official Node.js 16 image as the base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the source code to the container
COPY ./src ./src

# Expose the port your Node.js server listens on
EXPOSE 9285

# Start the Node.js server
CMD ["npm", "start"]

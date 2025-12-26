FROM node:20-alpine

WORKDIR /app

# برای npm ci باید package-lock.json وجود داشته باشد
COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node","dist/main.js"]

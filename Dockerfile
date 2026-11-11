FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
COPY tests ./tests
COPY public ./public
COPY fixtures ./fixtures
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATA_DIR=/app/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/fixtures ./fixtures
COPY package.json ./
EXPOSE 8787
CMD ["node", "dist/src/index.js"]

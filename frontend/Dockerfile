FROM node:20-slim

WORKDIR /app/frontend

COPY package.json package-lock.json* ./
RUN npm install \
 && ARCH=$(uname -m) \
 && if [ "$ARCH" = "aarch64" ]; then BINDING=@next/swc-linux-arm64-gnu; else BINDING=@next/swc-linux-x64-gnu; fi \
 && npm install --no-save "$BINDING"

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:20-slim

WORKDIR /app/frontend

# Install deps one directory up so Node's node_modules walk works for files in
# BOTH `/app/frontend/src/...` AND `/app/modules/<name>/frontend/...` — module
# pages live outside the frontend dir and need bare imports (e.g. `@mantine/core`)
# to resolve.
COPY package.json package-lock.json* /app/
RUN cd /app \
 && npm install \
 && ARCH=$(uname -m) \
 && if [ "$ARCH" = "aarch64" ]; then BINDING=@next/swc-linux-arm64-gnu; else BINDING=@next/swc-linux-x64-gnu; fi \
 && npm install --no-save "$BINDING"

# Mirror package.json into the frontend dir so `npm run dev` in the WORKDIR
# still finds scripts. The actual node_modules lives at /app/node_modules.
RUN ln -s /app/package.json package.json \
 && ln -s /app/node_modules node_modules

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

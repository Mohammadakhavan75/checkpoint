FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite inlines VITE_* at build time, so they must be provided as build args
# (the runtime env no longer applies once this is a production build).
ARG VITE_API_BASE
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Fail fast if the compose file didn't pass the build args — otherwise the
# bundle silently bakes empty strings (no API base, no Google sign-in).
RUN test -n "$VITE_API_BASE" || \
    (echo "ERROR: VITE_API_BASE build arg is empty — pass it via build.args in docker-compose" && exit 1)
RUN test -n "$VITE_GOOGLE_CLIENT_ID" || \
    echo "WARNING: VITE_GOOGLE_CLIENT_ID build arg is empty — Google sign-in will be hidden"

RUN npm run build

EXPOSE 5173

# Serve the built app (content-hashed, cacheable assets + a no-cache index.html)
# instead of the Vite dev server, whose stable /src/* URLs got cached as stale
# by browsers and home-screen PWAs.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]

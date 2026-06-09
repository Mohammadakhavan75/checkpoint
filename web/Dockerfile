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

RUN npm run build

EXPOSE 5173

# Serve the built app (content-hashed, cacheable assets + a no-cache index.html)
# instead of the Vite dev server, whose stable /src/* URLs got cached as stale
# by browsers and home-screen PWAs.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]

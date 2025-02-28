# ---------------------------- #
# Etapa 1: Base com Node.js
FROM node:20.13.1-alpine AS base

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --omit=dev

COPY . .

# ---------------------------- #
# Etapa 2: Produção
FROM base AS production

ENV NODE_ENV=production
ARG PORT=3002
ENV PORT=${PORT}

RUN mkdir -p /app && chmod -R 777 /app

EXPOSE ${PORT}

CMD ["sleep", "infinity"]
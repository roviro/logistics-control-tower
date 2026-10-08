FROM oven/bun:alpine AS base
WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

# Instalar dependências
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copiar arquivos do projeto
COPY . .

# Compilar frontend
RUN bun run build

EXPOSE 3333

ENV PORT=3333
ENV NODE_ENV=production

CMD ["bun", "run", "src/server/index.ts"]

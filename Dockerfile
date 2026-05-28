# Usa uma imagem oficial do Node.js baseada em Debian (suporta o Chrome)
FROM node:18-bullseye-slim

# Instala as dependências do sistema necessárias para o Chrome / Puppeteer e OpenSSL para o Prisma
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    chromium \
    openssl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o restante do código
COPY . .

# Gera o client do Prisma
RUN npx prisma generate

# Faz o build do Next.js
RUN npm run build

# Expõe a porta que o Next.js vai rodar
EXPOSE 3000

# Variáveis de ambiente para o Puppeteer usar o Chromium instalado no sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV RENDER=true

# Comando para iniciar o servidor em produção
CMD ["npm", "start"]

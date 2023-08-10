FROM node:18-slim

RUN apt update
RUN apt upgrade -y
RUN apt install -y \
    libatk-bridge2.0-0 \
    libxkbcommon-x11-0 \
    libgbm1 chromium \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends
RUN rm -rf /var/lib/apt/lists/*
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser
RUN mkdir -p /home/pptruser
RUN chown -R pptruser:pptruser /home/pptruser

USER pptruser

WORKDIR "/home/pptruser"

RUN npm install puppeteer

COPY ./package.json ./
RUN npm install --omit=dev

COPY ./app ./app

CMD ["node", "./app/index.js"]

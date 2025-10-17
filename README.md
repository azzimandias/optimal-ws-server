### ⚙️ Настройка окружения

1. Скопируйте `.env.example`:
   ```bash
   cp .env.example .env



http://192.168.1.16:3777/

# ИНСТРУКЦИЯ

## 1. Подготовка сервера

ssh root@192.168.1.16

## 2. Установка зависимостей

cd /var/www/server
npm install

## 3. Настройка PM2

pm2 kill
pm2 start ecosystem.config.js
pm2 list

## 4. Проверка портов
ss -tulnp | grep 5003

### должно вернуться:
tcp   LISTEN 0 511 *:5003 *:* users:(("node /var/www/server/app.js",pid=XXXX,fd=XX))

## 5. Проверка работы фронтенда

Фронтенд должен подключаться к ws://192.168.1.16:5003/.

HTTP-запросы тоже через http://192.168.1.16:5003/.

В браузере можно открыть лог-вьювер:
http://192.168.1.16:5003/
Там должны отображаться live HTTP-запросы.

# 6. Настройка автозапуска PM2

pm2 save
pm2 startup
# Usamos imagen oficial Node 18 (ajusta según la versión que uses)
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos package.json y package-lock.json (si tienes)
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos todo el código (incluido .env)
COPY . .

# Exponemos el puerto que usa tu app (ejemplo 3000, ajústalo si es otro)
EXPOSE 3000

# Comando para arrancar la app (ajusta si usas otro script)
CMD ["npm", "start"]

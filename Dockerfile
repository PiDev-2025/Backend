# Utiliser une image officielle de Node.js
FROM node:20-alpine AS builder

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --legacy-peer-deps 


# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port utilisé par Express
EXPOSE 5000

# Démarrer le serveur
CMD ["npm", "start"]

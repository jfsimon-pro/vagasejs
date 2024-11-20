# Use uma imagem oficial do Node.js como base
FROM node:20

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie o arquivo package.json e package-lock.json (se disponível)
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código da aplicação para o contêiner
COPY . .
RUN npx prisma generate

# Exponha a porta que o Node.js vai escutar
EXPOSE 3000

# Defina o comando padrão para rodar a aplicação
CMD ["npm", "start"]

// app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;
const helmet = require('helmet');
const path = require('path');
const authRoutes = require('./routes/auth');
const empresaRoutes = require('./routes/empresa');
const candidatoRoutes = require('./routes/candidato');
const adminRoutes = require('./routes/admin');
// Configurações
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "connect-src": ["'self'", "https://viacep.com.br", "https://api-publica.speedio.com.br", "https://api.cnpjs.dev"], // Permite conexões à API do ViaCEP
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'"],
      },
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Registro das rotas
app.use('/auth', authRoutes);
app.use('/empresa', empresaRoutes);
app.use('/candidato', candidatoRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.render('home'); // Renderiza o arquivo home.ejs
});


// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

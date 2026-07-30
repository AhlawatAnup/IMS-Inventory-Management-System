require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const connectDB = require('./src/database/db');
const { noCache, preventAuth } = require('./src/middleware/authMiddleware.js');

connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
);

const publicPath = path.join(__dirname, './public');
app.use(express.static(publicPath));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URI,
    touchAfter: 24 * 3600,
    ttl: 60 * 60 * 24 * 30,
  }),
  cookie: { maxAge: 60 * 60 * 1000 * 24 * 30 },
});

app.use(sessionMiddleware);
app.get('/', express.json());

app.get('/', noCache, preventAuth, (req, res) => {
  res.sendFile(path.join(publicPath, 'home.pack', 'home.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

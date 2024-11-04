import { config } from 'dotenv';
config();
import express from 'express';
import { neon } from "@neondatabase/serverless";
import session from 'express-session';
import QRCode from 'qrcode';
import cors from 'cors';
import create from './create.js'
import login from './login.js'

const app = express();
const sql = neon(process.env.DATABASE_URL);
const port = parseInt(process.env.PORT) || 3000;

const corsOptions = {
  origin: '*', // or replace with specific origins like 'http://example.com'
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  })
);

const generateQR = async text => {
  try {
    var data = await QRCode.toDataURL(text);
    var dataSplit = data.split(',');
    var base64 = dataSplit[1];
    return base64;
  } catch (err) {
    console.error(err)
  }
}

app.get('/', (req, res) => {
  res.status(200).send("Hello World From API");
});
app.post('/create', create);
app.post('/login', login);

app.get('/all', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM clients`;
    res.status(200).send({ status: "success", message: result });
  } catch (e) {
    res.status(500).send({ status: "failed", message: e.message });
  }
})

app.get('/home', async (req, res) => {
  var balance = Math.floor(Math.random() * 300).toFixed(2);
  if (req.session.user) {
    console.log(req.session.user)
    let qr = await generateQR(req.session.user.uuid); // data:image/png;base64,
    try {
      const [{ result }] = await sql`
          INSERT INTO users (uuid, balance, qrcode) VALUES (${req.session.user.uuid}, ${balance}, ${qr})
          RETURNING TRUE AS result
      `;
      if (result) {
        res.status(200).send({ message: 'Welcome to Home!', user: req.session.user });
        return;
      }
    } catch (e) {
      res.status(500).send({ error: e.message });
      return;
    }
  }
  res.status(401).send({ error: 'Not authenticated' });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

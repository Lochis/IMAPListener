import express from 'express';
import startImapListener from './startImap.js';
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Simple route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

startImapListener();


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

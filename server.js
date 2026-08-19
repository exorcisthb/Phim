const express = require('express');
const path = require('path');
const app = express();

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`RoPhim Cinema server running on port ${PORT}`);
});

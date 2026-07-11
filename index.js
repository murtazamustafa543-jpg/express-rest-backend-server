const express = require('express');  

const app = express(); 

const PORT = 3000;  


app.use(express.json());


app.get('/', (req, res) => {
  console.log('Someone hit the root endpoint');  // logs in your terminal
  res.json({
    message: 'Hello World',
    status: 'Server is running',
    timestamp: new Date().toISOString()  // current time
  });
});

app.get('/about', (req, res) => {
  console.log('Someone hit the /about endpoint');
  res.json({
    name: 'Murtaza Mustafa',
    role: 'Backend AI Engineering Intern',
    company: 'FlyRank',
    program: 'Backend AI Engineering - July 2026'
  });
});

app.get('/status', (req, res) => {
  console.log('Someone hit the /status endpoint');
  res.json({
    online: true,
    uptime: process.uptime() + ' seconds',  
    nodeVersion: process.version
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /');
  console.log('  GET /about');
  console.log('  GET /status');
});
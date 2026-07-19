const express=require('express');
const app=express();

app.use(express.json());

app.get('/',(req,res)=>{
 res.json({
    message: 'Hello World',
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    name: 'Murtaza Mustafa',
    role: 'Backend AI Engineering Intern',
    company: 'FlyRank',
    program: 'Backend AI Engineering - July 2026'

 });

});

app.get('/s1',(req,res)=>{
 res.json({
     name: "Task API",
      version: "1.0", 
      endpoints: ["/s1","/health"] 
 });

});

app.get('/health',(req,res)=>{
res.json({
 status:"ok"
});
});

 app.listen(3000,()=>{
   console.log(`Server is running on http://localhost:3000`);
     console.log(`for intro http://localhost:3000/`);
     console.log(`for stage 1 http://localhost:3000/s1`);
     console.log(`for health http://localhost:3000/health`);
 })







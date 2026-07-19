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
 app.listen(3000,()=>{
   console.log(`Server is running on http://localhost:3000`);
     console.log(`for intro http://localhost:3000/`);
 })







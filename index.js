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

let task=[
  { id: 1, title: "do assignemnt 1", done: false },
  { id: 2, title: "Read a resource", done: true },
  { id: 3, title: "take a shower", done: false }
];

app.get('/tasks',(req,res)=>{
res.json(task);
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id); 
  const tk = task.find(t => t.id === id); 
  if (!tk) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(tk);
});
 app.listen(3000,()=>{
   console.log(`Server is running on http://localhost:3000`);
     console.log(`for intro http://localhost:3000/`);
     console.log(`for stage 1 http://localhost:3000/s1`);
     console.log(`for health http://localhost:3000/health`);
      console.log(`for all tasks http://localhost:3000/tasks`);
       console.log(`for tasks by id http://localhost:3000/tasks/`);
 })







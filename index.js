const express=require('express')
const dotenv=require('dotenv')
const cors=require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config()
const uri=process.env.MONGODB_URI

const app=express()
const PORT=process.env.PORT
app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
   
    await client.connect();
    

    const db=client.db("study-nook")
    const roomCollection=db.collection("rooms")

    app.post(('/rooms'), async (req, res) =>{
        console.log(req.body)
        const roomData=req.body
        const result=await roomCollection.insertOne(roomData)
        res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);

app.get(('/'),(req,res)=>{
    res.send("server is running")
})

app.listen(PORT, ()=>{
console.log(`running on port: ${PORT}`)
})
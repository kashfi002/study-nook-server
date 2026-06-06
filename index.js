const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()

const uri = process.env.MONGODB_URI
const app = express()
const PORT = process.env.PORT || 5000; // Fallback to 5000 if not defined

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let roomCollection;
let bookingCollection;
async function run() {
  try {
    await client.connect();
    const db = client.db("study-nook");
     roomCollection = db.collection("rooms");
    bookingCollection =db.collection("bookings");

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}
run().catch(console.dir);

app.get('/rooms', async (req, res) => {
    try {
        const result = await roomCollection.find().toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

app.post('/rooms', async (req, res) => {
    try {
        const roomData = req.body;
        const result = await roomCollection.insertOne(roomData);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to create room" });
    }
});

app.get('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await roomCollection.findOne({ _id: new ObjectId(id) });
        if (!result) return res.status(404).json({ error: "Room not found" });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID format or server error" });
    }
});

app.patch('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        delete updateData._id;

        const result = await roomCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to update room" });
    }
});

app.delete('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to delete room" });
    }
});

app.post('/booking',async(req,res)=>{
    const bookingData=req.body
    const result= await bookingCollection.insertOne(bookingData)
})
app.get('/booking', async (req, res) => {
        const result = await bookingCollection.find().toArray();
        res.json(result);
   
});
app.get('/', (req, res) => {
    res.send("server is running")
})

app.listen(PORT, () => {
    console.log(`running on port: ${PORT}`)
})
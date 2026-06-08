const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet } = require('jose-cjs');
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

 const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    )

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const { jwtVerify } = require('jose-cjs');
        const { payload } = await jwtVerify(token, JWKS);
        next();
    } catch (error) {
        return res.status(403).json({ error: "Forbidden" });
    }
};

let roomCollection;
let bookingCollection;
async function run() {
  try {
    await client.connect();
    const db = client.db("study-nook");
     roomCollection = db.collection("rooms");
    bookingCollection =db.collection("bookings");

app.get('/rooms', async (req, res) => {
    try {
        const { search, amenities, minRate, maxRate, floor } = req.query;
        const query = {};

        if (search) {
            query.roomName = { $regex: search, $options: 'i' };
        }

        if (amenities) {
            const amenitiesArray = amenities.split(',');
            query.amenities = { $in: amenitiesArray };
        }

        if (minRate || maxRate) {
            query.hourlyRate = {};
            if (minRate) query.hourlyRate.$gte = Number(minRate);
            if (maxRate) query.hourlyRate.$lte = Number(maxRate);
        }

        if (floor) {
            query.floor = { $regex: floor, $options: 'i' };
        }

        const result = await roomCollection.find(query).toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

app.post('/rooms',verifyToken, async (req, res) => {
    try {
        const roomData = req.body;
        const result = await roomCollection.insertOne(roomData);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to create room" });
    }
});

app.get('/rooms/latest', async (req, res) => {
    try {
        const result = await roomCollection
            .find()
            .sort({ _id: -1 })
            .limit(6)
            .toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch latest rooms" });
    }
});
app.get('/rooms/my-listings/:creatorId', verifyToken, async (req, res) => {
    try {
        const { creatorId } = req.params;
        const result = await roomCollection.find({ creatorId }).toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});
app.get('/rooms/:id',verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await roomCollection.findOne({ _id: new ObjectId(id) });
        if (!result) return res.status(404).json({ error: "Room not found" });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID format or server error" });
    }
});

app.patch('/rooms/:id',verifyToken, async (req, res) => {
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

app.delete('/rooms/:id',verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to delete room" });
    }
});

app.post('/booking',verifyToken, async (req, res) => {
    try {
        const bookingData = req.body;
        const { roomId, bookingDate, startTime, endTime } = bookingData;

        const conflict = await bookingCollection.findOne({
            roomId: roomId,
            bookingDate: bookingDate,
            status: 'confirmed',
            $or: [
                {
                    startTime: { $gte: startTime, $lt: endTime }
                },
                {
                    endTime: { $gt: startTime, $lte: endTime }
                },
                {
                    startTime: { $lte: startTime },
                    endTime: { $gte: endTime }
                }
            ]
        });

        if (conflict) {
            return res.status(409).json({ error: "This room is already booked for the selected time." });
        }

        const result = await bookingCollection.insertOne({ ...bookingData, status: 'confirmed' });
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to create booking" });
    }
});

app.get('/booking',verifyToken, async (req, res) => {
        const result = await bookingCollection.find().toArray();
        res.json(result);
   
});
app.get('/booking/:userId',verifyToken, async (req, res) => {
    const {userId} = req.params
        const result = await bookingCollection.find({userId:userId}).toArray();
        res.json(result);
   
});
app.delete('/booking/:id',verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await bookingCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'cancelled' } }
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to cancel booking" });
    }
});
 await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send("server is running")
})

app.listen(PORT, () => {
    console.log(`running on port: ${PORT}`)
})
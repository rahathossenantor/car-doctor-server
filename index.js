const { MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@junior.tpsklbw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctorDB").collection("services");
        const bookingsCollection = client.db("carDoctorDB").collection("bookings");

        // get all services data
        app.get("/services", async (req, res) => {
            const data = await serviceCollection.find().toArray();
            res.send(data);
        });

        // get single service data
        app.get("/service/:id", async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const options = {
                projection: { service_id: 1, title: 1, img: 1, price: 1 }
            };
            const data = await serviceCollection.findOne(query, options);
            res.send(data);
        });

        // post single data
        app.post("/bookings", async (req, res) => {
            const data = req.body;
            const result = await bookingsCollection.insertOne(data);
            res.send(result);
        });

        // load some data based on condition
        app.get("/bookings", async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = {
                    email: req.query.email
                }
            }
            const data = await bookingsCollection.find(query).toArray();
            res.send(data);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Car Doctor Server 1.0");
});

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

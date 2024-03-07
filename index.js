const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middlewares
app.use(cors({
    origin: [
        "https://cardoctors.netlify.app",
        "https://car-doctor-1o1.web.app",
        "https://car-doctor-1o1.firebaseapp.com"
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

// custom middlewares
const logger = async (req, res, next) => {
    console.log(`location: ${req.hostname}${req.url}`);
    next();
};

// verify user by there jwt token
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.secretToken;
    if (!token) {
        return res.status(401).send({message: "Unauthorized access!"});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.error(err.message);
            return res.status(401).send({message: "Unauthorized access!"});
        }
        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
//        await client.connect();

        const serviceCollection = client.db("carDoctorDB").collection("services");
        const bookingsCollection = client.db("carDoctorDB").collection("bookings");

        // auth related apis
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const jwtToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "1h"});
            res
                .cookie("secretToken", jwtToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none"
                })
                .send({success: true});
        });

        app.post("/logout", async (req, res) => {
            const user = req.body;
            res
                .clearCookie("secretToken", {maxAge: 0})
                .send({success: true});
        });

        // to create secret
        // require("crypto").randomBytes(64).toString("hex");

        // data related apis
        // get all services data
        app.get("/services", logger, async (req, res) => {
            const data = await serviceCollection.find().toArray();
            res.send(data);
        });

        // get single service data
        app.get("/service/:id", logger, async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const options = {
                projection: {service_id: 1, title: 1, img: 1, price: 1}
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

        // load some data based on user
        app.get("/bookings", logger, verifyToken, async (req, res) => {
            if (req.query?.email !== req?.user?.email) {
                return res.status(403).send({message: "Forbidden!"});
            }
            let query = {};
            if (req.query?.email) {
                query = {
                    email: req.query.email
                }
            }
            const data = await bookingsCollection.find(query).toArray();
            res.send(data);
        });

        // delete single data based on condition
        app.delete("/bookings/:id", async (req, res) => {
            const query = {_id: new ObjectId(req.params.id)};
            const data = await bookingsCollection.deleteOne(query);
            res.send(data);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ping: 1});
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

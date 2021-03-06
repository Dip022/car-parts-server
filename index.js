const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kmnhk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("car-parts").collection("parts");
    const orderCollection = client.db("car-parts").collection("order");
    const userCollection = client.db("car-parts").collection("users");
    const reviewsCollection = client.db("car-parts").collection("reviews");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requestAccount = await userCollection.findOne({
        email: requester,
      });

      if (requestAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    };

    //login jwt
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "12h",
      });
      res.send({ result, token });
    });

    //get parts
    app.get("/parts", async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get part
    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });

    //get all orders
    app.get("/all-order", async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.send(result);
    });

    //get all orders
    app.get("/orderes-product/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    //get all orders
    app.get("/orderes-product/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    //get all reviews
    app.get("/all-reviews", async (req, res) => {
      const result = await reviewsCollection.find({}).toArray();
      res.send(result);
    });

    //all user get
    app.get("/user", async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    //get all orders
    app.get("/all-order", async (req, res) => {
      const result = await partsCollection.find({}).toArray();
      res.send(result);
    });

    //post new order
    app.post("/order", async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });

    // make admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // post profile info
    app.put("/profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          fullName: user.fullName,
          image: user.image,
          phoneNumber: user.phoneNumber,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          city: user.city,
          state: user.state,
          postalCode: user.postalCode,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // add product post
    app.post("/new-product", verifyJWT, verifyAdmin, async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await partsCollection.insertOne(newProduct);
      res.send(result);
    });

    // review add
    app.post("/review/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const review = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          rating: review.rating,
        },
      };
      const updateReview = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      if (updateReview.acknowledged) {
        const result = await reviewsCollection.insertOne(review);
        return res.send(result);
      }
      return res.send({ message: "Review Faild" });
    });

    //delete order
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    //user delete
    app.delete("/user/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    //part delete
    app.delete("/part/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(filter);
      res.send(result);
    });

    // all orders get
    app.get("/all-order", async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.send(result);
    });

    // admin check
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
  } finally {
  }
}
run().catch(console.dir);
// root server
app.get("/", (req, res) => {
  res.send("Car Parts Server is Running!");
});

app.listen(port, () => {
  console.log(`This server is running port is: ${port}`);
});

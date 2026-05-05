require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri =
  "mongodb://fahmida:QWKkGFNXv3JNZatp@ac-8qe4bjh-shard-00-00.p14mh0y.mongodb.net:27017/customglow?tls=true&authSource=admin&directConnection=true";

console.log("Testing single MongoDB shard connection...");

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  family: 4
});

async function run() {
  try {
    await client.connect();

    const result = await client.db("customglow").command({ ping: 1 });

    console.log("MongoDB connected successfully!");
    console.log(result);
  } catch (error) {
    console.log("MongoDB connection failed:");
    console.log("Name:", error.name);
    console.log("Message:", error.message);
    console.log("Full error:", error);
  } finally {
    await client.close();
  }
}

run();
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

console.log("Testing MongoDB native driver connection...");
console.log("MONGO_URI exists:", !!uri);
console.log("URI type:", uri.startsWith("mongodb+srv") ? "SRV" : "Non-SRV");

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  family: 4
});

client.on("serverOpening", (event) => {
  console.log("Server opening:", event.address);
});

client.on("serverClosed", (event) => {
  console.log("Server closed:", event.address);
});

client.on("serverDescriptionChanged", (event) => {
  console.log("Server changed:", event.address);
  console.log("New type:", event.newDescription.type);

  if (event.newDescription.error) {
    console.log("Server error:", event.newDescription.error.message);
  }
});

client.on("topologyDescriptionChanged", (event) => {
  console.log("Topology changed:");
  console.log("Old:", event.previousDescription.type);
  console.log("New:", event.newDescription.type);
});

async function testConnection() {
  try {
    await client.connect();

    const db = client.db("customglow");
    const result = await db.command({ ping: 1 });

    console.log("MongoDB connected successfully!");
    console.log("Ping result:", result);
  } catch (error) {
    console.log("MongoDB connection failed:");
    console.log("Name:", error.name);
    console.log("Message:", error.message);
    console.log("Full error:", error);
  } finally {
    await client.close();
  }
}

testConnection();
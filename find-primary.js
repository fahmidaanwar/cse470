const { MongoClient } = require("mongodb");

const username = "fahmida";
const password = "QWKkGFNXv3JNZatp";

const hosts = [
  "ac-8qe4bjh-shard-00-00.p14mh0y.mongodb.net",
  "ac-8qe4bjh-shard-00-01.p14mh0y.mongodb.net",
  "ac-8qe4bjh-shard-00-02.p14mh0y.mongodb.net"
];

async function checkHost(host) {
  const uri = `mongodb://${username}:${password}@${host}:27017/customglow?tls=true&authSource=admin&directConnection=true`;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4
  });

  try {
    await client.connect();

    const result = await client.db("admin").command({ hello: 1 });

    console.log("\nHost:", host);
    console.log("Connected: YES");
    console.log("isWritablePrimary:", result.isWritablePrimary);
    console.log("secondary:", result.secondary);

    if (result.isWritablePrimary) {
      console.log("✅ THIS IS THE PRIMARY SERVER");
    }
  } catch (error) {
    console.log("\nHost:", host);
    console.log("Connected: NO");
    console.log("Error:", error.message);
  } finally {
    await client.close();
  }
}

async function run() {
  for (const host of hosts) {
    await checkHost(host);
  }
}

run();
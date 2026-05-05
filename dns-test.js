const dns = require("dns");

const hosts = [
  "ac-8qe4bjh-shard-00-00.p14mh0y.mongodb.net",
  "ac-8qe4bjh-shard-00-01.p14mh0y.mongodb.net",
  "ac-8qe4bjh-shard-00-02.p14mh0y.mongodb.net"
];

hosts.forEach((host) => {
  dns.lookup(host, { all: true, family: 4 }, (err, addresses) => {
    if (err) {
      console.log(host, "FAILED", err.message);
    } else {
      console.log(host, "OK", addresses);
    }
  });
});
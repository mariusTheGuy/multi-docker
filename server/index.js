const keys = require("./keys");

// EXPRESS APP SETUP
const express = require("express");
const bodyParser = require("body-parser");
/**
 * cors: cross origin resource shared
 * allow us to make request from one domain that the React app is going to running on,
 * to a different domain / port, in this case the express api i which is hosted on
 */
const cors = require("cors");

// will hear and respond to any incoming HTTP request
const app = express();
/**
 * cross origin resource sharing:
 * allow us to make requests from one domain
 * that the REACT application is going to running on
 * to a different domain/port that the EXPRESS api is hosted on
 */
app.use(cors());
/**
 * parse incoming requests from the REACT application
 * and turn the body of POST request
 * into a JSON value that our EXPRESS api can work with
 */
app.use(bodyParser.json());

// POSTGRES CLIENT SETUP
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});
// 'values': name of the table
// 'number': is going to store the indixes that come from the REACT app
pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

// REDIS CLIENT SETUP
const redis = require("redis");
/**
 * 'retry_strategy:' if redis connections is lost,
 * we will try to reconnect each 1000 miliseconds
 */
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// EXPRESS ROUTE HANDLES
app.get("/", (req, res) => {
  res.send("Hi");
});

// all the indexes that've been submitted so far in our app
app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values");

  res.send(values.rows);
});
// all the keys(indexes) - values (fibonacci corrspondent value) pairs
app.get("/values/current", async (req, res) => {
  // node library doesn't support promises for REDIS, so we use a callback
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});
// receive new index value
app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }
  // set a provisional value
  redisClient.hset("values", index, "Nothing yet!");
  // sent message
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});

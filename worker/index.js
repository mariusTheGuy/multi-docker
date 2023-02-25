// REDIS CLIENT SETUP
/**
 * we will store the required keys
 * to connect to REDIS in this file
 */
const keys = require("./keys");
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

/**
 * 'sub' as in subscription, is a duplicate client of 'redisClient'
 * it will watch redis and will receive a message anytime a new index is added
 * to the redis db
 * 'hset': hashset
 * 'message': is the key
 *  */
const sub = redisClient.duplicate();

// this anonimous function will run any time redis sends a new message
// it will calculate the fibonacci value given the index submitted
sub.on("message", (channel, message) => {
  redisClient.hset("values", message, fib(parseInt(message)));
});

/**
 * this function will listen for the 'insert' event
 * and then call the above anonimous function of 'sub'
 */
sub.subscribe("insert");

// fibonnacci function
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

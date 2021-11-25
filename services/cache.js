const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');
// const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (){
    //Here we are doing this to know if we have to use cache or not
    //So whenever using Mongoose just use .cache() ahead of the query to cahce it..
   this.useCache = true;
   //It gives us nested data structure in redis where every post is 
   //stored in users id key or empty string
   this.hashkey = JSON.stringify(options.key || '');
   return this;
};

mongoose.Query.prototype.exec = async function () {
    if(!this.useCache) return exec.apply(this, arguments);
  /* Here we are assigning the mongoose query to a first 
     empty object without messing with the actual object we are getting ,
   second argument gives the queries and third argument assigns the collection name.  
  */
   const key = JSON.stringify(Object.assign({}, this.getQuery(), {
          collection: this.mongooseCollection.name
    }));

    //See if we have value for key in the redis
    const cachedValue = await client.hget(this.hashkey, key);

    //if we do that return that
    if(cachedValue){
      //Here we have to check if we are dealing with array or objext so
      const doc = JSON.parse(cachedValue);
      return Array.isArray(doc) ? doc.map(d => new this.model(d))
       : new this.model(doc);
    }
    //Otherwise , issue the query and store the result in the redis
    const result = await exec.apply(this, arguments);
    client.hset(this.hashkey, key, JSON.stringify(result), 'EX', 10);
    return result;
};

module.exports = {
    clearHash(hashkey){
        client.del(JSON.stringify(hashkey));
    }
}
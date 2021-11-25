const {clearHash} = require('../services/cache');

module.exports = async (req, res, next) => {
//this will clear out the cache after we run the route
// function

  await next();

  clearHash(req.user.id);
}
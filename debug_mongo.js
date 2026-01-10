const connectMongo = require('connect-mongo');
console.log('connectMongo.MongoStore.create:', connectMongo.MongoStore ? connectMongo.MongoStore.create : 'MongoStore missing');
console.log('connectMongo.default.create:', connectMongo.default ? connectMongo.default.create : 'default missing');

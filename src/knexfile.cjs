const path = require('path');

module.exports = {
   client: "better-sqlite3",
   useNullAsDefault: true,
   connection: {
      filename: path.resolve(__dirname, '..', 'db', 'db.sqlite'),
   }
};

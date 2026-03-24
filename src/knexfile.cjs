const path = require('path');

module.exports = {
   client: "sqlite3",
   useNullAsDefault: true,
   connection: {
      filename: path.resolve(__dirname, '..', 'db.sqlite'),
   }
};

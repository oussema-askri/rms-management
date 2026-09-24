// Deletes every document in the clients collection.
//
// This script previously ran the delete immediately on execution, with no
// confirmation and no indication of which database it was pointed at, so
// `node cleanClients.js` in the wrong shell destroyed production data.
//
// It now reports what it is about to do and refuses unless the caller states
// the intent explicitly:
//
//   CONFIRM_DELETE_CLIENTS=yes node cleanClients.js
//
// Run without the variable to see the target and the document count only.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const cleanClients = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const dbName = mongoose.connection.name;
    const collection = mongoose.connection.collection('clients');
    const count = await collection.countDocuments();

    console.log(`Database : ${dbName}`);
    console.log(`Clients  : ${count}`);

    if (process.env.CONFIRM_DELETE_CLIENTS !== 'yes') {
      console.log('');
      console.log('Nothing deleted. This is a dry run.');
      console.log('To actually delete every client above, re-run with:');
      console.log('  CONFIRM_DELETE_CLIENTS=yes node cleanClients.js');
      await mongoose.disconnect();
      process.exit(0);
    }

    const result = await collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} client(s) from ${dbName}.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

cleanClients();

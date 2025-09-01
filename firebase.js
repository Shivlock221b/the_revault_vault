const admin = require('firebase-admin');

/*
 * Initialize the Firebase Admin SDK. The SDK requires service account
 * credentials to authenticate. You can provide these credentials by
 * specifying the path to a JSON key file via the FIREBASE_SERVICE_ACCOUNT
 * environment variable, or by placing a `serviceAccountKey.json` file in
 * the same directory as this module. See the Firebase documentation for
 * details on generating service account keys:
 * https://firebase.google.com/docs/admin/setup
 */
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to a local file named serviceAccountKey.json. This file should
    // not be committed to source control. Add it to your .gitignore.
    try {
      serviceAccount = require('./serviceAccountKey.json');
    } catch (err) {
      throw new Error(
        'Firebase service account credentials not found. Provide a JSON key via the FIREBASE_SERVICE_ACCOUNT environment variable or place serviceAccountKey.json in the web directory.'
      );
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // If using the Realtime Database, specify the URL here. For Firestore
    // it's not required.
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return admin.app();
}

// Initialise Firebase and export the Firestore database instance. Firestore
// provides a flexible document store that's ideal for storing orders and
// redemption requests.
const firebaseApp = initializeFirebase();
const db = admin.firestore(firebaseApp);

module.exports = db;
const admin = require('firebase-admin');
require('dotenv').config();

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
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      }),
    });
  }
  return admin.app();
}

// Initialise Firebase and export the Firestore database instance. Firestore
// provides a flexible document store that's ideal for storing orders and
// redemption requests.
const firebaseApp = initializeFirebase();
const db = admin.firestore(firebaseApp);

module.exports = db;
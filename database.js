const db = require('./firebase');

/*
 * Firestore helper functions. Each function performs the necessary
 * asynchronous operations to interact with the Firestore database. The
 * collections used are `orders` and `redemptions`. Firestore
 * automatically assigns document IDs when using `add()`. You can access
 * the document ID via `docRef.id`. For demonstration purposes we also
 * generate a separate ID field inside the document so that the data
 * structure mirrors the original file‑based implementation.
 */

/**
 * Generate a simple unique identifier using the current timestamp and a
 * random component. Firestore already provides a unique document ID, but
 * generating our own ID makes it easier to reference records from the
 * client.
 * @returns {string}
 */
function generateId() {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)
  );
}

/**
 * Create a new order document in Firestore. Returns the stored object
 * including the Firestore document ID.
 * @param {object} data
 */
async function createOrder(data) {
  const order = { ...data, _customId: generateId() };
  const docRef = await db.collection('orders').add(order);
  return { id: docRef.id, ...order };
}

/**
 * Retrieve all orders. Optionally filter by email.
 * @param {string=} email
 */
async function listOrders(email) {
  let query = db.collection('orders');
  if (email) {
    query = query.where('email', '==', email);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retrieve a single order by its Firestore document ID.
 * @param {string} id
 */
async function getOrder(id) {
  const doc = await db.collection('orders').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Update an order. Only provided fields are updated.
 * @param {string} id
 * @param {object} updates
 */
async function updateOrder(id, updates) {
  const ref = db.collection('orders').doc(id);
  await ref.update(updates);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

/**
 * Create a new redemption request. Returns the stored object including
 * its Firestore document ID.
 * @param {object} data
 */
async function createRedemption(data) {
  const redemption = { ...data, _customId: generateId() };
  const docRef = await db.collection('redemptions').add(redemption);
  return { id: docRef.id, ...redemption };
}

/**
 * Retrieve redemption requests. Optionally filter by email.
 * @param {string=} email
 */
async function listRedemptions(email) {
  let query = db.collection('redemptions');
  if (email) {
    query = query.where('email', '==', email);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Approve a redemption request.
 * @param {string} id
 */
async function approveRedemption(id) {
  const ref = db.collection('redemptions').doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.status === 'approved') return { id: doc.id, ...data };
  await ref.update({ status: 'approved', approvedAt: new Date().toISOString() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

/**
 * User management functions
 */

/**
 * Create or update a user record. If a user with the provided email already
 * exists, their data is merged with the provided data. Returns the new or
 * updated user document.
 * @param {object} data - Contains at minimum an `email` field. Other
 *   optional fields include `displayName` or any additional profile info.
 */
async function createUser(data) {
  const { email, ...rest } = data;
  if (!email) {
    throw new Error('Email is required to create a user');
  }
  const ref = db.collection('users').doc(email);
  const doc = await ref.get();
  const now = new Date().toISOString();
  if (doc.exists) {
    // Merge existing data with new data (preserve createdAt)
    const existing = doc.data();
    await ref.set({ ...existing, ...rest, updatedAt: now }, { merge: true });
  } else {
    await ref.set({ email, ...rest, createdAt: now, updatedAt: now });
  }
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

/**
 * Fetch a user by their email. Returns null if not found.
 * @param {string} email
 */
async function getUser(email) {
  const doc = await db.collection('users').doc(email).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Update a user's data with the provided updates. Returns the updated user.
 * @param {string} email
 * @param {object} updates
 */
async function updateUser(email, updates) {
  const ref = db.collection('users').doc(email);
  await ref.set(updates, { merge: true });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

/**
 * List all users in the database. Returns an array of user objects.
 */
async function listUsers() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Delete a user record by email. Removes the user document entirely. Use with caution
 * because this does not cascade deletes on orders or redemptions.
 * @param {string} email
 */
async function deleteUser(email) {
  await db.collection('users').doc(email).delete();
  return { success: true };
}

/**
 * Delete an order by its Firestore document ID. This removes the order record. This function
 * should be used carefully because it may leave dangling references if a redemption or
 * other record points to this order.
 * @param {string} id
 */
async function deleteOrder(id) {
  await db.collection('orders').doc(id).delete();
  return { success: true };
}

/*
 * Contact query management functions
 *
 * These helpers allow the server to record queries submitted via the contact
 * form on the landing page and retrieve them for the admin dashboard. A
 * simple schema is used: each document contains the sender's name,
 * brand, email, website (optional), message and a timestamp. A custom
 * identifier is also added to mirror the pattern used for orders and
 * redemptions, although Firestore will also generate its own document
 * ID which is returned to the client.
 */

/**
 * Create a new contact query. Accepts an object containing at least
 * `name`, `brand`, `email` and `message`. Automatically adds a
 * `createdAt` timestamp and a `_customId` for easier reference on the
 * client side.
 * @param {object} data
 */
async function createQuery(data) {
  const query = { ...data, _customId: generateId() };
  const ref = await db.collection('queries').add(query);
  return { id: ref.id, ...query };
}

/**
 * Retrieve all contact queries. Returns an array of query objects. The
 * results are not ordered by default; client code may sort them if
 * desired.
 */
async function listQueries() {
  const snapshot = await db.collection('queries').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Delete a contact query by its document ID. This helper isn't used
 * currently but is provided for completeness should the admin wish to
 * remove queries from the dashboard.
 * @param {string} id
 */
async function deleteQuery(id) {
  await db.collection('queries').doc(id).delete();
  return { success: true };
}

/**
 * Shop management functions
 */

/**
 * Create a new shop record. Returns the created shop object with its
 * auto‑generated Firestore document ID.
 * @param {object} data - Should include at minimum a `name` field. Other
 *   optional fields: `shopId`, `image`, `url`, `totalDistributed`.
 */
async function createShop(data) {
  const shop = { ...data, createdAt: new Date().toISOString() };
  const ref = await db.collection('shops').add(shop);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

/**
 * List shops. Returns an array of shop objects.
 */
async function listShops() {
  const snapshot = await db.collection('shops').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retrieve a single shop by its Firestore document ID.
 * @param {string} id
 */
async function getShop(id) {
  const doc = await db.collection('shops').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Update an existing shop. Only provided fields are updated.
 * @param {string} id
 * @param {object} updates
 */
async function updateShop(id, updates) {
  const ref = db.collection('shops').doc(id);
  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

/**
 * Delete a shop by its Firestore document ID.
 * @param {string} id
 */
async function deleteShop(id) {
  await db.collection('shops').doc(id).delete();
  return { success: true };
}

/**
 * Associate an existing order with a user. Finds the order document by
 * the Shopify orderId (not the Firestore document id) and sets the
 * `userEmail` field to the given email. If the order has already been
 * attributed to a user, it will not overwrite the assignment. Returns the
 * updated order object or null if the order isn't found.
 * @param {string} orderId - The Shopify order GID or number.
 * @param {string} email - The user's email address.
 */
async function claimOrder(orderId, email) {
  if (!orderId || !email) {
    throw new Error('orderId and email are required');
  }
  // Search for order by orderId (the original order identifier). We use
  // `.where()` to filter. The `orderId` stored in Firestore refers to the
  // Shopify GID or number depending on the implementation of createOrder.
  const snapshot = await db
    .collection('orders')
    .where('orderId', '==', orderId)
    .get();
  if (snapshot.empty) {
    return null;
  }
  let updatedOrder = null;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.userEmail) {
      await doc.ref.update({ userEmail: email });
    }
    const refreshed = await doc.ref.get();
    updatedOrder = { id: refreshed.id, ...refreshed.data() };
  }
  return updatedOrder;
}

/**
 * Retrieve the current gold price from the configuration collection. If not
 * set, return the default price used elsewhere in the server. This function
 * assumes there is a single document `goldPrice` in the `config` collection.
 */
async function getGoldPrice(defaultPrice) {
  const doc = await db.collection('config').doc('goldPrice').get();
  if (!doc.exists) {
    return defaultPrice;
  }
  const data = doc.data();
  return data.price;
}

/**
 * Set the current gold price. Creates or updates the `goldPrice` document
 * within the `config` collection. Returns the new price.
 * @param {number} price
 */
async function setGoldPrice(price) {
  const ref = db.collection('config').doc('goldPrice');
  await ref.set({ price: parseFloat(price), updatedAt: new Date().toISOString() }, { merge: true });
  return price;
}

/**
 * Compute dashboard data for a given user. Returns an object containing
 * aggregated metrics and lists of orders and shops. Uses the current
 * gold price if available. Redeemable grams are those earned more than
 * 30 days ago and not yet redeemed.
 * @param {string} email - The user's email address.
 * @param {number} defaultPrice - The fallback gold price if config isn't set.
 */
async function getDashboardData(email, defaultPrice) {
  // Get current gold price
  const currentPrice = await getGoldPrice(defaultPrice);
  // Fetch user orders
  const orderSnap = await db
    .collection('orders')
    .where('userEmail', '==', email)
    .get();
  const orders = orderSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  // Aggregate total grams and value
  let totalGrams = 0;
  let totalValue = 0;
  let redeemableGrams = 0;
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  for (const order of orders) {
    totalGrams += order.rewardGrams || 0;
    totalValue += (order.rewardGrams || 0) * currentPrice;
    // Determine redeemable grams: orders created at least 30 days ago
    const createdTime = order.createdAt ? new Date(order.createdAt).getTime() : now;
    if (now - createdTime >= thirtyDays) {
      redeemableGrams += order.rewardGrams || 0;
    }
  }
  // Subtract already redeemed grams
  const redemptionsSnap = await db
    .collection('redemptions')
    .where('email', '==', email)
    .where('status', 'in', ['pending', 'approved'])
    .get();
  let redeemed = 0;
  for (const doc of redemptionsSnap.docs) {
    const data = doc.data();
    redeemed += data.grams || 0;
  }
  redeemableGrams = Math.max(redeemableGrams - redeemed, 0);
  totalValue = parseFloat(totalValue.toFixed(2));
  // Determine progress: choose next milestone as next whole gram increment
  const nextMilestone = Math.ceil(totalGrams) || 1;
  const progressPercent = totalGrams / nextMilestone;
  // Fetch shops
  const shopsSnap = await db.collection('shops').get();
  const shops = shopsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    totalGrams,
    totalValue,
    redeemableGrams,
    currentPrice,
    orders,
    shops,
    progress: {
      current: totalGrams,
      nextMilestone,
      progressPercent,
    },
  };
}

module.exports = {
  generateId,
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  createRedemption,
  listRedemptions,
  approveRedemption,
  // New exports for user, shop, configuration and dashboard helpers
  createUser,
  getUser,
  updateUser,
  listUsers,
  createShop,
  listShops,
  getShop,
  updateShop,
  deleteShop,
  claimOrder,
  getGoldPrice,
  setGoldPrice,
  getDashboardData,
  // additional helpers for admin
  deleteUser,
  deleteOrder,
  // helpers for contact queries
  createQuery,
  listQueries,
  deleteQuery
};
import Dexie from 'dexie';
import axios from 'axios';

const db = new Dexie('FarmPerksDB');
db.version(1).stores({
  products: '++id,name,category,quantity,harvest_date,minimum_threshold',
  sales: '++id,product_id,quantity_sold,price_per_unit,buyer_name,buyer_contact',
  expenses: '++id,description,amount,category,expense_date',
  buyers: '++id,name,contact,address',
  marketPrices: '++id,product_id,price,date,source',
});

export const saveOfflineRecord = async (type, record) => {
  await db[type].add(record);
};

export const getOfflineRecords = async (type) => {
  return await db[type].toArray();
};

// Helper to clean records by removing Dexie-generated id and other unexpected fields
const cleanRecord = (record) => {
  const { id, ...cleanedRecord } = record;
  return cleanedRecord;
};

export const syncRecords = async (token) => {
  try {
    // Check if online
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please connect to sync data.');
    }

    // Retrieve all offline records
    const offlineData = {
      products: (await getOfflineRecords('products')).map(cleanRecord),
      sales: (await getOfflineRecords('sales')).map(cleanRecord),
      buyers: (await getOfflineRecords('buyers')).map(cleanRecord),
      prices: (await getOfflineRecords('marketPrices')).map(cleanRecord),
      expenses: (await getOfflineRecords('expenses')).map(cleanRecord),
    };

    // If no data to sync, return early
    const totalRecords = Object.values(offlineData).reduce((sum, records) => sum + records.length, 0);
    if (totalRecords === 0) {
      return { success: true, message: 'No offline data to sync.' };
    }

    // Send all data to the sync-offline-data endpoint
    const response = await axios.post(
      'http://127.0.0.1:5000/api/sync-offline-data',
      offlineData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // On success, clear all synced records
    await Promise.all([
      clearOfflineRecords('products'),
      clearOfflineRecords('sales'),
      clearOfflineRecords('buyers'),
      clearOfflineRecords('marketPrices'),
      clearOfflineRecords('expenses'),
    ]);

    const { synced, errors } = response.data.results;
    return {
      success: true,
      message: `Synced successfully: ${synced.products} products, ${synced.sales} sales, ${synced.buyers} buyers, ${synced.prices} prices, ${synced.expenses} expenses.`,
      errors,
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to sync data';
    console.error('Sync failed:', error);
    return { success: false, message: errorMessage };
  }
};

export const clearOfflineRecords = async (type) => {
  await db[type].clear();
};
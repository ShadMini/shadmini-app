import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// هذه الدالة تضمن عدم فشل البناء إذا لم يكن MONGODB_URI موجوداً
function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    // أثناء البناء على Vercel، قد لا يكون المتغير موجوداً، نعيد وعاءً وهمياً
    // لن يؤثر هذا على التطبيق الحقيقي لأنه في وقت التشغيل سيكون المتغير موجوداً
    if (process.env.NODE_ENV === 'production') {
      return Promise.resolve({} as MongoClient);
    }
    throw new Error('يرجى إضافة MONGODB_URI في متغيرات البيئة');
  }

  const options = {};

  if (process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    return client.connect();
  }
}

clientPromise = getClientPromise();
export default clientPromise;
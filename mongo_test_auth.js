const { MongoClient } = require('mongodb');
const variants = [
  'mongodb://mongo:EkPQqqLGAIrxnUqiwcxWhoPrDkGBFYlp@acela.proxy.rlwy.net:45752/mizpah-online?authSource=admin',
  'mongodb://mongo:EkPQqqLGAIrxnUqiwcxWhoPrDkGBFYlp@acela.proxy.rlwy.net:45752/mizpah-online?authSource=admin&tls=true',
  'mongodb://mongo:EkPQqqLGAIrxnUqiwcxWhoPrDkGBFYlp@acela.proxy.rlwy.net:45752/mizpah-online?authSource=admin&tls=false',
  'mongodb://mongo:EkPQqqLGAIrxnUqiwcxWhoPrDkGBFYlp@acela.proxy.rlwy.net:45752/mizpah-online?authSource=admin&tls=true&directConnection=true',
  'mongodb://mongo:EkPQqqLGAIrxnUqiwcxWhoPrDkGBFYlp@acela.proxy.rlwy.net:45752/mizpah-online?authSource=admin&directConnection=true',
];

(async () => {
  for (const uri of variants) {
    console.log('URI', uri);
    const client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    try {
      await client.connect();
      console.log('connected');
      const res = await client.db('mizpah-online').command({ ping: 1 });
      console.log('ping', res);
    } catch (e) {
      console.error('failed', e.name, e.message);
    } finally {
      try {
        await client.close();
      } catch (_) {}
    }
  }
})();
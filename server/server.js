const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to database (MongoDB Atlas or fallback)
  await connectDB();

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  Mr Moses Poster Store - Server Running`);
    console.log(`  Local Website:    http://localhost:${PORT}`);
    console.log(`  Admin Portal:     http://localhost:${PORT}/admin`);
    console.log(`  WhatsApp Contact: +91 ${process.env.WHATSAPP_NUMBER || '8754126367'}`);
    console.log('====================================================');
  });
};

startServer().catch(err => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});

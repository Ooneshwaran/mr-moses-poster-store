const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/db');
const repository = require('../config/repository');

const createAdminAccount = async () => {
  await connectDB();

  const args = process.argv.slice(2);
  let username = args[0];
  let password = args[1];

  if (!username || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log('\n--- Mr Moses Poster Store: First Admin Setup ---');
    username = await question('Enter Admin Username (default: admin): ') || 'admin';
    password = await question('Enter Admin Password (min 8 characters): ');
    rl.close();
  }

  username = username.trim().toLowerCase();
  if (!password || password.length < 8) {
    console.error('\n[Error] Password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    const existing = await repository.getAdminByUsername(username);
    if (existing) {
      console.log(`\n[Notice] Admin user "${username}" already exists.`);
      console.log('To reset password, remove the user from database or use a different username.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await repository.createAdmin({
      username,
      passwordHash
    });

    console.log('\n====================================================');
    console.log(`  Administrator account created successfully!`);
    console.log(`  Username: ${username}`);
    console.log(`  Login at: http://localhost:${process.env.PORT || 5000}/admin`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[Error] Failed to create admin account:', err.message);
    process.exit(1);
  }
};

createAdminAccount();

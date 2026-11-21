const mongoose = require('mongoose');
const User = require('../models/User');
const Visitor = require('../models/Visitor');

const uri = process.env.MONGODB_URI || '';
const localTestDatabase = /^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/safepass_local_test(?:\?|$)/i.test(uri);
if (!['test', 'development'].includes(process.env.NODE_ENV) || !localTestDatabase) {
  throw new Error('Refusing fixtures: requires NODE_ENV=test/development and localhost safepass_local_test.');
}

const accounts = [
  { role: 'admin', phone: '09170000000' },
  { role: 'visitor', phone: '09170000001' },
  { role: 'teacher', phone: '09170000002', teacherId: 'QA-T01' },
  { role: 'security', phone: '09170000003' },
  { role: 'staff', phone: '09170000004', department: 'Registrar' },
  { role: 'student', phone: '09170000005' },
];

async function seedFixtures() {
  await mongoose.connect(uri);
  try {
    for (const account of accounts) {
      const { role, phone } = account;
      const email = `fixture-${role}@example.test`;
      const username = `fixture-${role}`;
      const existingUser = await User.findOne({ email, username, role });
      if (existingUser) {
        if (existingUser.phone !== phone) {
          await User.updateOne({ _id: existingUser._id }, { $set: { phone } });
        }
        continue;
      }

      let visitorId;
      if (role === 'visitor') {
        const visitDate = new Date(Date.now() + 86400000);
        const visitor = await Visitor.findOne({ email }) || await Visitor.create({
          fullName: 'Fixture Visitor',
          email,
          phoneNumber: phone,
          purposeOfVisit: 'Test fixture',
          visitDate,
          visitTime: visitDate,
          approvalStatus: 'approved',
          status: 'approved',
        });
        visitorId = visitor._id;
      }

      await User.create({
        ...account,
        firstName: 'Fixture',
        lastName: role,
        username,
        email,
        password: 'Fixture-Only-Password!26',
        status: 'active',
        isActive: true,
        isVerified: true,
        visitorId,
      });
    }
    console.log('Test fixtures ready');
  } finally {
    await mongoose.disconnect();
  }
}

seedFixtures().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // --- 1. SETUP USERS ---
  
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      username: 'testuser1',
      email: 'user1@example.com',
      password: hashedPassword,
      bio: 'Ini adalah user pertama.',
      profile_picture_path: null,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      username: 'testuser2',
      email: 'user2@example.com',
      password: hashedPassword, 
      bio: 'Bio user kedua.',
      profile_picture_path: null,
    },
  });
  
  const user3 = await prisma.user.upsert({
    where: { email: 'user3@example.com' },
    update: {},
    create: {
      username: 'testuser3',
      email: 'user3@example.com',
      password: hashedPassword, 
      bio: 'Bio user ketiga.',
      profile_picture_path: null,
    },
  });

  console.log(`Created users: ${user1.username}, ${user2.username}, and ${user3.username}`);

  // --- 2. SETUP THREADS ---
  
  const thread1 = await prisma.thread.create({
    data: {
      user_id: user1.user_id,
      title: 'Selamat Datang di Forum Diskusi General',
      content: 'Ini adalah thread pertama. Konten ini normal dan aman.',
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      user_id: user2.user_id,
      title: 'Thread Uji Broken Access Control (BAC)',
      content: 'Isi thread ini harusnya hanya bisa diubah/dihapus oleh testuser2.',
    },
  });

  const thread3 = await prisma.thread.create({
    data: {
      user_id: user3.user_id,
      title: 'Informasi Penting Mengenai Keamanan',
      content: 'Pastikan kata kunci yang dicari adalah "keamanan" atau "penting".',
    },
  });
  
  const thread4 = await prisma.thread.create({
    data: {
      user_id: user1.user_id,
      title: 'Random Discussion Topic',
      content: 'Just another topic.',
    },
  });


  console.log(`Created threads: ${thread1.title} - ${thread4.title}`);

  // --- 3. SETUP POSTS (BALASAN) ---
  
  const post1 = await prisma.post.create({
    data: {
      user_id: user2.user_id,
      thread_id: thread1.thread_id,
      content: 'Balasan pertama dari user2.',
    },
  });

  const post2 = await prisma.post.create({
    data: {
      user_id: user3.user_id,
      thread_id: thread1.thread_id,
      content: 'Balasan pertama dari user3.',
    },
  });

  // --- 4. SETUP LIKES ---
  
  await prisma.postLike.create({
    data: {
      post_id: post2.post_id,
      user_id: user1.user_id,
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
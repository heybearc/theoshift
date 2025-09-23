<<<<<<< HEAD
import NextAuth from 'next-auth';
import { authOptions } from '../../../../../auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
=======
import NextAuth from 'next-auth'
import { authOptions } from '@/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
>>>>>>> feature/api-foundation

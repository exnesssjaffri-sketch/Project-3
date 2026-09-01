import { redirect } from 'next/navigation';

// The board lives at /board — send root visitors straight there.
export default function HomePage() {
  redirect('/board');
}
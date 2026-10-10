import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";

export default function App() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1>Eden</h1>

      <SignedOut>
        <p>Sign in to start your garden.</p>
        <SignInButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <UserButton />
        <p>Welcome to Eden. Your garden will appear here.</p>
      </SignedIn>
    </main>
  );
}

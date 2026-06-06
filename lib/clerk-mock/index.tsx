import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignIn() {
  return (
    <div className="p-6 border rounded bg-zinc-900 border-zinc-700 text-zinc-200">
      <h3 className="text-xl font-bold mb-4">Mock Sign In</h3>
      <p className="text-sm text-zinc-400 mb-4">Bypassed Clerk Auth in Local Test Mode</p>
      <a href="/dashboard" className="px-4 py-2 bg-cyan-400 text-black rounded font-bold hover:bg-cyan-300 transition-colors inline-block text-center">
        Go to Dashboard
      </a>
    </div>
  );
}

export function SignUp() {
  return (
    <div className="p-6 border rounded bg-zinc-900 border-zinc-700 text-zinc-200">
      <h3 className="text-xl font-bold mb-4">Mock Sign Up</h3>
      <p className="text-sm text-zinc-400 mb-4">Bypassed Clerk Auth in Local Test Mode</p>
      <a href="/onboarding" className="px-4 py-2 bg-cyan-400 text-black rounded font-bold hover:bg-cyan-300 transition-colors inline-block text-center">
        Proceed to Onboarding
      </a>
    </div>
  );
}

export function UserButton() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full border-zinc-700 bg-zinc-900 text-zinc-200 text-sm">
      <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold text-xs">M</div>
      <span>Mock User</span>
    </div>
  );
}

export function OrganizationSwitcher() {
  return (
    <div className="px-3 py-1.5 border rounded-lg border-zinc-700 bg-zinc-900 text-zinc-200 text-sm flex items-center gap-2">
      <span className="font-semibold text-cyan-400">🏢 Mock Workspace</span>
    </div>
  );
}

export function OrganizationList({ afterCreateOrganizationUrl }: any) {
  return (
    <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700 text-zinc-200 max-w-md mx-auto">
      <h3 className="text-lg font-bold mb-2">Create Mock Workspace</h3>
      <p className="text-sm text-zinc-400 mb-6">Since Clerk is bypassed in local test mode, click below to initialize your organization workspace and head to the dashboard.</p>
      <a 
        href="/dashboard"
        className="block w-full py-2.5 bg-cyan-400 text-black text-center rounded-lg font-bold hover:bg-cyan-300 transition-colors"
      >
        Initialize Workspace & Enter Dashboard
      </a>
    </div>
  );
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'mock_user_123',
      firstName: 'Mock',
      lastName: 'User',
      imageUrl: '',
      emailAddresses: [{ emailAddress: 'mock@maintly.test' }]
    }
  };
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: 'mock_user_123',
    orgId: 'mock_org_123',
  };
}

export function Show({ when, children }: { when: any; children: React.ReactNode }) {
  return when ? <>{children}</> : null;
}

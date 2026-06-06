import { NextResponse } from 'next/server';

export async function auth() {
  return {
    userId: 'mock_user_123',
    orgId: 'mock_org_123',
    redirectToSignIn: () => {
      return NextResponse.redirect(new URL('/sign-in', 'http://localhost:3000'));
    }
  };
}

export async function currentUser() {
  return {
    id: 'mock_user_123',
    firstName: 'Mock',
    lastName: 'User',
    emailAddresses: [
      { emailAddress: 'mock@maintly.test' }
    ]
  };
}

export function clerkMiddleware(callback: any) {
  return async (req: any, event: any) => {
    const authObj = {
      userId: 'mock_user_123',
      orgId: 'mock_org_123',
      protect: () => {
        // No-op for mock auth protection
      }
    };
    const res = await callback(authObj, req, event);
    return res || NextResponse.next();
  };
}

export function createRouteMatcher(routes: string[]) {
  return (req: any) => {
    const url = new URL(req.url);
    return routes.some(route => {
      // Basic route matcher converting (.*) to regex
      const cleaned = route.replace(/\(\.\*\)/g, '.*');
      return new RegExp(`^${cleaned}$`).test(url.pathname);
    });
  };
}

import { useUser } from "@clerk/expo";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";

function useDummyUser() {
  return {
    isLoaded: true,
    isSignedIn: false,
    user: null,
  };
}

export const useMobileUser = CLERK_PUBLISHABLE_KEY ? useUser : useDummyUser;

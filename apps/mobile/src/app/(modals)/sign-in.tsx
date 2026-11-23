import { useOAuth } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";
import {
  evaluateOAuthResult,
  evaluateSignInResult,
  evaluateSignUpResult,
} from "@/features/auth/sign-in-rules";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function getErrorMessage(err: unknown, defaultMsg: string): string {
  if (typeof err === "object" && err !== null && "errors" in err) {
    const clerkErr = err as {
      errors?: { message?: string; longMessage?: string }[];
    };
    if (clerkErr.errors && clerkErr.errors.length > 0) {
      return (
        clerkErr.errors[0]?.longMessage ||
        clerkErr.errors[0]?.message ||
        defaultMsg
      );
    }
  }
  if (err instanceof Error) return err.message;
  return defaultMsg;
}

function NoClerkKeyFallback({ onDismiss }: { onDismiss: () => void }) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.mist} />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closePill,
            pressed && styles.closePillPressed,
          ]}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.centerWrap}>
        <View style={[styles.card, mobileTheme.shadows.cardElevated]}>
          <FloralSprig
            size={44}
            color={mobileTheme.colors.accent}
            accentColor={mobileTheme.colors.palette.marigold}
          />
          <Text style={styles.brandTitle}>CHERRYQUBE</Text>
          <Text style={styles.brandTagline}>Handmade holiday celebrations</Text>
          <Text style={styles.title}>Keep your celebrations close</Text>
          <Text style={styles.copy}>
            Authentication keys are not configured in this environment. Set
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign-in.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ClerkSignInContent({ onDismiss }: { onDismiss: () => void }) {
  const { isSignedIn } = useMobileAuth();
  const {
    signIn,
    setActive: setSignInActive,
    isLoaded: isSignInLoaded,
  } = useSignIn();
  const {
    signUp,
    setActive: setSignUpActive,
    isLoaded: isSignUpLoaded,
  } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      onDismiss();
    }
  }, [isSignedIn, onDismiss]);

  const onSendEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp) {
      setError("Sign-in is initializing. Please try again in a moment.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const attempt = await signIn.create({ identifier: trimmed });
      const factor = attempt.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      );
      if (factor && "emailAddressId" in factor) {
        await attempt.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });
        setIsNewUser(false);
        setStep("verify");
      } else {
        setError(
          "Email verification code is not configured for this account. Please sign in with Google.",
        );
      }
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: { code?: string; message?: string }[];
      };
      const errCode = clerkErr?.errors?.[0]?.code;
      if (errCode === "form_identifier_not_found") {
        try {
          await signUp.create({ emailAddress: trimmed });
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setIsNewUser(true);
          setStep("verify");
        } catch (signUpErr) {
          setError(
            getErrorMessage(signUpErr, "Failed to send verification code."),
          );
        }
      } else {
        setError(getErrorMessage(err, "Could not start email sign-in."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isNewUser) {
        if (!signUp || !setSignUpActive) return;
        const result = await signUp.attemptEmailAddressVerification({
          code: cleanCode,
        });
        const outcome = evaluateSignUpResult(result);
        if (outcome.success && outcome.sessionId) {
          await setSignUpActive({ session: outcome.sessionId });
          onDismiss();
        } else {
          setError(
            outcome.error ||
              "Verification was not completed. Please check your code and try again.",
          );
        }
      } else {
        if (!signIn || !setSignInActive) return;
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: cleanCode,
        });
        const outcome = evaluateSignInResult(result);
        if (outcome.success && outcome.sessionId) {
          await setSignInActive({ session: outcome.sessionId });
          onDismiss();
        } else {
          setError(
            outcome.error ||
              "Verification was not completed. Please check your code and try again.",
          );
        }
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Invalid or expired verification code. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await startOAuthFlow();
      const outcome = evaluateOAuthResult(result);
      if (outcome.success && outcome.sessionId && result.setActive) {
        await result.setActive({ session: outcome.sessionId });
        onDismiss();
      } else {
        setError(
          outcome.error ||
            "Google sign-in could not be completed. Please try again.",
        );
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not complete Google sign-in."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.mist} />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          disabled={isLoading}
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closePill,
            pressed && styles.closePillPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, mobileTheme.shadows.cardElevated]}>
            <FloralSprig
              size={44}
              color={mobileTheme.colors.accent}
              accentColor={mobileTheme.colors.palette.marigold}
            />
            <Text style={styles.brandTitle}>CHERRYQUBE</Text>
            <Text style={styles.brandTagline}>
              Handmade seasonal celebrations
            </Text>

            {step === "email" ? (
              <>
                <Text style={styles.title}>Welcome to CherryQube</Text>
                <Text style={styles.copy}>
                  Sign in to save your cards, customize invitations, and manage
                  guests across devices.
                </Text>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#9E8E81"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (error) setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                  onPress={onSendEmail}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    isLoading && styles.buttonDisabled,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF8ED" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Continue with email
                    </Text>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  onPress={onGoogleSignIn}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.socialButton,
                    pressed && styles.socialButtonPressed,
                    isLoading && styles.buttonDisabled,
                  ]}
                >
                  <GoogleIcon size={18} />
                  <Text style={styles.socialButtonText}>
                    Continue with Google
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.copy}>
                  We sent a 6-digit verification code to{"\n"}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>6-digit code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="123456"
                    placeholderTextColor="#9E8E81"
                    value={code}
                    onChangeText={(val) => {
                      setCode(val.replace(/[^0-9]/g, "").slice(0, 6));
                      if (error) setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Verify code"
                  onPress={onVerifyCode}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    isLoading && styles.buttonDisabled,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF8ED" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify code</Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use a different email"
                  onPress={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                  disabled={isLoading}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>Use a different email</Text>
                </Pressable>
              </>
            )}

            <Text style={styles.footnote}>
              Your designs stay private to your account. Guests never need an
              account.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function SignInModal() {
  const hasDismissedRef = useRef(false);
  const dismissModal = useCallback(() => {
    if (hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    router.back();
  }, []);

  if (!CLERK_PUBLISHABLE_KEY) {
    return <NoClerkKeyFallback onDismiss={dismissModal} />;
  }

  return <ClerkSignInContent onDismiss={dismissModal} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
    overflow: "hidden",
  },
  mist: {
    backgroundColor: mobileTheme.colors.palette.marigold + "22",
    borderRadius: 999,
    height: 380,
    position: "absolute",
    right: -100,
    top: -80,
    width: 380,
  },
  topBar: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  closePill: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 6,
    ...mobileTheme.shadows.card,
  },
  closePillPressed: {
    backgroundColor: mobileTheme.colors.canvas,
    opacity: 0.8,
  },
  closeText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  centerWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.sheet,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "100%",
  },
  brandTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    letterSpacing: 2,
    marginTop: 10,
    textAlign: "center",
  },
  brandTagline: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
    marginTop: 18,
    textAlign: "center",
  },
  copy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  emailHighlight: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
  },
  errorBanner: {
    backgroundColor: mobileTheme.colors.palette.oxblood + "14",
    borderColor: mobileTheme.colors.palette.oxblood + "33",
    borderRadius: mobileTheme.radius.cardSmall,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  errorText: {
    color: "#8E1B2E",
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  inputWrap: {
    marginTop: 20,
    width: "100%",
  },
  inputLabel: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 15,
    height: 48,
    paddingHorizontal: 18,
  },
  codeInput: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.pill,
    height: 48,
    justifyContent: "center",
    marginTop: 16,
    width: "100%",
    ...mobileTheme.shadows.pill,
  },
  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFF8ED",
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginVertical: 18,
    width: "100%",
  },
  dividerLine: {
    backgroundColor: mobileTheme.colors.hairline,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 48,
    justifyContent: "center",
    width: "100%",
    ...mobileTheme.shadows.pill,
  },
  socialButtonPressed: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    opacity: 0.9,
  },
  socialButtonText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  backLink: {
    marginTop: 16,
    paddingVertical: 6,
  },
  backLinkText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  footnote: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 22,
    textAlign: "center",
  },
});

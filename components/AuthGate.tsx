@@ .. @@
   useEffect(() => {
     if (isLoading) return; // Wait for auth state to load

-    const inAuthGroup = segments[0] === '(auth)';
+    const inAuthGroup = segments[0] === '(auth)' || segments[0] === '(onboarding)';
     const isAuthenticated = !!session && !!user;

     if (!isAuthenticated && !inAuthGroup) {
-      // User is not authenticated and not in auth flow - redirect to auth
-      router.replace('/(auth)/welcome');
+      // User is not authenticated and not in auth/onboarding flow - redirect to university selection
+      router.replace('/(onboarding)/welcome');
     } else if (isAuthenticated && inAuthGroup) {
       // User is authenticated but still in auth flow - redirect to main app
       router.replace('/(tabs)/home');
     }
   }, [user, session, isLoading, segments, router]);
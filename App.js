import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  SafeAreaView,
  BackHandler,
  ActivityIndicator,
  View,
  StyleSheet,
  Image,
  Text,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// WebView is only available on native; web uses an iframe
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const TARGET_URL = 'https://socialhub.wevysya.com';
const logo = require('./assets/WeVysya Logo New Branding.png');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission was not granted.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7FFFD4',
    });
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return tokenResponse.data;
  } catch (error) {
    console.log('Failed to fetch Expo push token:', error);
    return null;
  }
}

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);
  const notificationReceivedListener = useRef(null);
  const notificationResponseListener = useRef(null);
  const shimmerTranslate = useRef(new Animated.Value(-180)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

  // Handle Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 180,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmerLoop.start();

    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      shimmerLoop.stop();
    };
  }, [shimmerTranslate, splashOpacity]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    registerForPushNotificationsAsync().then((token) => {
      if (!token) {
        return;
      }

      console.log('Expo Push Token:', token);

      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'expoPushToken',
            token,
          })
        );
      }
    });

    notificationReceivedListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        if (!webViewRef.current) {
          return;
        }

        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'notificationReceived',
            payload: notification.request.content,
          })
        );
      });

    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};

        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'notificationTapped',
              payload: data,
            })
          );
        }

        if (typeof data.url === 'string' && webViewRef.current) {
          webViewRef.current.injectJavaScript(
            `window.location.href = ${JSON.stringify(data.url)}; true;`
          );
        }
      });

    return () => {
      if (notificationReceivedListener.current) {
        Notifications.removeNotificationSubscription(
          notificationReceivedListener.current
        );
      }

      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(
          notificationResponseListener.current
        );
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {Platform.OS === 'web' ? (
        <iframe
          src={TARGET_URL}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
          title="WeVysya Social Hub"
          allow="camera; microphone"
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: TARGET_URL }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          useWebKit={true}
          originWhitelist={['https://*', 'http://*']}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          onNavigationStateChange={(navState) => {
            canGoBackRef.current = navState.canGoBack;
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#7fffd4" />
            </View>
          )}
        />
      )}
      {showSplash ? (
        <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity }]}>
          <View style={styles.splashBackground}>
            <View style={[styles.ring, styles.ringSmall]} />
            <View style={[styles.ring, styles.ringMedium]} />
            <View style={[styles.ring, styles.ringLarge]} />
            <View style={styles.lightStreakLeft} />
            <View style={styles.lightStreakRight} />
            <View style={styles.auraLarge} />
            <View style={styles.auraCore} />
          </View>

          <View style={styles.splashContent}>
            {/* Top section: logo + branding */}
            <View style={styles.topSection}>
              <View style={styles.logoWrap}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={styles.brandBlock}>
                <Text style={styles.title}>WeVysya Social Hub</Text>
                <Text style={styles.subtitle}>
                  Generate flyers & manage our community presence
                </Text>
              </View>
            </View>

            {/* Bottom section: tagline + progress + footer */}
            <View style={styles.bottomSection}>
              <View style={styles.taglineBlock}>
                <Text style={styles.taglineLine}>Stop Thinking 'i',</Text>
                <Text style={styles.taglineLine}>
                  Start Thinking <Text style={styles.taglineAccent}>'WE'</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { transform: [{ translateX: shimmerTranslate }] },
                  ]}
                />
              </View>

              <Text style={styles.poweredBy}>Powered by WeVysya</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1F1A',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  splashBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A1A16',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ringSmall: {
    width: 280,
    height: 280,
    left: '50%',
    top: '32%',
    marginLeft: -140,
    marginTop: -140,
    borderColor: 'rgba(127,255,212,0.08)',
  },
  ringMedium: {
    width: 420,
    height: 420,
    left: '50%',
    top: '32%',
    marginLeft: -210,
    marginTop: -210,
    borderColor: 'rgba(127,255,212,0.05)',
  },
  ringLarge: {
    width: 580,
    height: 580,
    left: '50%',
    top: '32%',
    marginLeft: -290,
    marginTop: -290,
    borderColor: 'rgba(127,255,212,0.03)',
  },
  lightStreakLeft: {
    position: 'absolute',
    top: -40,
    left: '22%',
    width: 1,
    height: 220,
    backgroundColor: 'rgba(127,255,212,0.08)',
    transform: [{ rotate: '45deg' }],
  },
  lightStreakRight: {
    position: 'absolute',
    bottom: -40,
    right: '22%',
    width: 1,
    height: 220,
    backgroundColor: 'rgba(127,255,212,0.08)',
    transform: [{ rotate: '45deg' }],
  },
  auraLarge: {
    position: 'absolute',
    left: '50%',
    top: '32%',
    width: 320,
    height: 320,
    marginLeft: -160,
    marginTop: -160,
    borderRadius: 160,
    backgroundColor: 'rgba(127,255,212,0.04)',
  },
  auraCore: {
    position: 'absolute',
    left: '50%',
    top: '32%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    borderRadius: 90,
    backgroundColor: 'rgba(127,255,212,0.02)',
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandBlock: {
    marginTop: 16,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(127,255,212,0.8)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  taglineBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  taglineLine: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
  taglineAccent: {
    color: '#7FFFD4',
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  progressFill: {
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#7FFFD4',
    shadowColor: '#7FFFD4',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  poweredBy: {
    color: 'rgba(255,255,255,0.20)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

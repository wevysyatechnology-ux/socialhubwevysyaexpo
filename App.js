import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  SafeAreaView,
  BackHandler,
  View,
  StyleSheet,
  Image,
  Text,
  Animated,
  Easing,
  Share,
  Alert,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

// WebView is only available on native; web uses an iframe
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const TARGET_URL = 'https://socialhub.wevysya.com';
// For local dev, comment the above and use your machine's IP:
// const TARGET_URL = 'http://192.168.1.102:8080/';
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

    const expoTokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    // On Android this is an FCM registration token, which is required
    // when sending directly via Firebase Cloud Messaging v1.
    const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();

    return {
      expoPushToken: expoTokenResponse?.data ?? null,
      devicePushToken: deviceTokenResponse?.data ?? null,
      devicePushTokenType: deviceTokenResponse?.type ?? null,
    };
  } catch (error) {
    console.log('Failed to fetch push tokens:', error);
    return null;
  }
}

const injectedJavaScript = `
  (function() {
    // ── Web Share API shim ────────────────────────────────────────────
    // In standalone/preview builds the Android System WebView (Chrome-based)
    // already has navigator.share on Navigator.prototype as a non-writable
    // getter. Direct assignment silently fails, so canShare({files}) returns
    // false and the web app falls through to the Supabase upload fallback
    // (which triggers the "new row violates row-level security policy" error).
    // Using Object.defineProperty on the navigator INSTANCE creates an own
    // property that shadows the prototype's implementation in all WebView builds.
    if (window.navigator) {
      var _rnShareImpl = async function(data) {
        try {
          if (data.files && data.files.length > 0) {
            var file = data.files[0];
            var reader = new FileReader();
            reader.onloadend = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHARE',
                payload: {
                  base64: reader.result,
                  mimeType: file.type || 'image/png',
                  title: data.title || '',
                  text: data.text || ''
                }
              }));
            };
            reader.onerror = function() {
              // FileReader failed — fall back to text-only share
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHARE',
                payload: { text: data.text || '', title: data.title || '' }
              }));
            };
            reader.readAsDataURL(file);
            return Promise.resolve();
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHARE',
              payload: data
            }));
            return Promise.resolve();
          }
        } catch (err) {
          console.error('Share interception error', err);
          return Promise.reject(err);
        }
      };

      var _rnCanShareImpl = function() { return true; };

      // Primary: Object.defineProperty creates an own property that shadows
      // any non-writable prototype property (works in Chrome WebView standalone).
      try {
        Object.defineProperty(window.navigator, 'share', {
          value: _rnShareImpl, writable: true, configurable: true
        });
      } catch (e) {
        try { window.navigator.share = _rnShareImpl; } catch (e2) {
          try { Navigator.prototype.share = _rnShareImpl; } catch (e3) {}
        }
      }

      try {
        Object.defineProperty(window.navigator, 'canShare', {
          value: _rnCanShareImpl, writable: true, configurable: true
        });
      } catch (e) {
        try { window.navigator.canShare = _rnCanShareImpl; } catch (e2) {
          try { Navigator.prototype.canShare = _rnCanShareImpl; } catch (e3) {}
        }
      }
    }

    // ── Track Blob/File URLs so we can resolve them synchronously ─────
    var _blobMap = {};
    var _origCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function(obj) {
      var url = _origCreateObjectURL(obj);
      if (obj instanceof Blob || obj instanceof File) {
        var r = new FileReader();
        r.onloadend = function() {
          _blobMap[url] = {
            base64: r.result,
            type: obj.type || 'application/octet-stream',
            name: (obj instanceof File) ? obj.name : ''
          };
        };
        r.readAsDataURL(obj);
      }
      return url;
    };

    // ── Shared download dispatcher ────────────────────────────────────
    function dispatchDownload(href, filename) {
      if (!href) return;
      filename = filename || 'download.png';

      if (href.startsWith('data:')) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DOWNLOAD',
          payload: { url: href, filename: filename }
        }));
        return;
      }

      if (href.startsWith('blob:')) {
        if (_blobMap[href]) {
          var info = _blobMap[href];
          var ext = info.type ? info.type.split('/')[1] : 'png';
          var fname = (filename && filename !== 'download.png')
            ? filename
            : (info.name || ('download.' + ext));
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DOWNLOAD',
            payload: { url: info.base64, filename: fname }
          }));
        } else {
          fetch(href)
            .then(function(res) { return res.blob(); })
            .then(function(blob) {
              var r = new FileReader();
              r.onloadend = function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'DOWNLOAD',
                  payload: { url: r.result, filename: filename }
                }));
              };
              r.readAsDataURL(blob);
            });
        }
        return;
      }

      if (href.startsWith('http://') || href.startsWith('https://')) {
        // Pass URL directly to native downloader — avoids freezing the
        // WebView JS thread with a heavy in-browser fetch + base64 conversion.
        // Native FileSystem.downloadAsync runs off the UI thread.
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DOWNLOAD',
          payload: { url: href, filename: filename, headers: { 'Cookie': document.cookie || '' } }
        }));
        return;
      }

      // Regular URL — pass through to native downloader
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'DOWNLOAD',
        payload: { url: href, filename: filename }
      }));
    }

    function getElementVisualSource(el) {
      if (!el) return '';

      if (el.tagName === 'IMG') {
        return el.currentSrc || el.src || el.getAttribute('src') || '';
      }

      if (el.tagName === 'CANVAS') {
        try {
          return el.toDataURL('image/png');
        } catch (e) {
          return '';
        }
      }

      var style = window.getComputedStyle(el);
      if (!style) return '';
      var bg = style.backgroundImage || '';
      if (bg.indexOf('url(') === -1) return '';

      var m = bg.match(/url\((['"]?)(.*?)\\1\)/);
      return m && m[2] ? m[2] : '';
    }

    function findBestFlyerElement() {
      var visuals = Array.prototype.slice.call(document.querySelectorAll('img, canvas, [style*="background-image"]'));
      if (!visuals.length) return null;

      var viewportHeight = window.innerHeight || 0;
      var best = null;
      var bestScore = -1;

      visuals.forEach(function(el) {
        var src = getElementVisualSource(el);
        if (!src) return;

        var rect = el.getBoundingClientRect();
        if (!rect || rect.width < 60 || rect.height < 60) return;

        var area = rect.width * rect.height;
        var verticalFocus = 1;
        if (viewportHeight > 0) {
          var centerY = rect.top + rect.height / 2;
          var distanceFromCenter = Math.abs((viewportHeight / 2) - centerY);
          verticalFocus = Math.max(0.2, 1 - (distanceFromCenter / viewportHeight));
        }

        var score = area * verticalFocus;
        if (score > bestScore) {
          best = el;
          bestScore = score;
        }
      });

      return best;
    }

    function extractDataUrlFromBlobUrl(blobUrl) {
      return fetch(blobUrl)
        .then(function(res) { return res.blob(); })
        .then(function(blob) {
          return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        });
    }

    function dispatchSharePayload(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SHARE',
        payload: payload
      }));
    }

    function dispatchShareFromImage(src) {
      if (!src) return;

      if (src.startsWith('data:')) {
        dispatchSharePayload({
          base64: src,
          title: 'Share Flyer',
          text: ''
        });
        return;
      }

      if (src.startsWith('blob:')) {
        extractDataUrlFromBlobUrl(src)
          .then(function(dataUrl) {
            dispatchSharePayload({
              base64: dataUrl,
              title: 'Share Flyer',
              text: ''
            });
          })
          .catch(function() {
            dispatchSharePayload({
              url: window.location.href,
              title: 'Share Flyer',
              text: ''
            });
          });
        return;
      }

      dispatchSharePayload({
        url: src,
        title: 'Share Flyer',
        text: ''
      });
    }

    // ── Intercept user clicks on <a download> ─────────────────────────
    // We do NOT intercept generic button clicks here — the website's own
    // click handlers must run so they can generate the blob/data URL for
    // the final rendered flyer. Our anchor.click() shim below catches it.
    document.addEventListener('click', function(event) {
      var target = event.target && event.target.closest && event.target.closest('a');
      if (target && target.hasAttribute('download')) {
        event.preventDefault();
        // Let site handlers complete (some builders reset zoom/state after click).
        // We only block browser navigation and trigger native download asynchronously.
        setTimeout(function() {
          dispatchDownload(target.getAttribute('href'), target.getAttribute('download') || 'download.png');
        }, 0);
      }
    }, true);

    // ── Intercept programmatic .click() on <a download> ──────────────
    // Flyer builders commonly do: link.href = blobUrl; link.click()
    // on a detached element — that never reaches the event listener above.
    var _origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      if (this.hasAttribute('download')) {
        var href = this.getAttribute('href');
        var name = this.getAttribute('download') || 'download.png';
        setTimeout(function() {
          dispatchDownload(href, name);
        }, 0);
        return;
      }
      _origAnchorClick.call(this);
    };

    var _longPressTimer = null;
    var _longPressFired = false;

    function clearLongPress() {
      if (_longPressTimer) {
        clearTimeout(_longPressTimer);
        _longPressTimer = null;
      }
    }

    document.addEventListener('touchstart', function(event) {
      var touchedVisual = event.target && event.target.closest && event.target.closest('img, canvas, [style*="background-image"]');
      if (!touchedVisual) {
        clearLongPress();
        return;
      }

      _longPressFired = false;
      clearLongPress();
      _longPressTimer = setTimeout(function() {
        _longPressFired = true;
        var src = getElementVisualSource(touchedVisual) || getElementVisualSource(findBestFlyerElement());
        if (src) {
          dispatchDownload(src, 'flyer.png');
        }
      }, 650);
    }, true);

    document.addEventListener('contextmenu', function(event) {
      var visual = event.target && event.target.closest && event.target.closest('img, canvas, [style*="background-image"]');
      if (!visual) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }

      var src = getElementVisualSource(visual) || getElementVisualSource(findBestFlyerElement());
      if (src) {
        dispatchDownload(src, 'flyer.png');
      }
    }, true);

    document.addEventListener('touchmove', clearLongPress, true);
    document.addEventListener('touchcancel', clearLongPress, true);
    document.addEventListener('touchend', function() {
      clearLongPress();
    }, true);
  })();

  true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);
  const notificationReceivedListener = useRef(null);
  const notificationResponseListener = useRef(null);
  const pendingTokensRef = useRef(null); // store tokens until WebView is ready
  const tokenFlushTimersRef = useRef([]); // retry timer IDs
  const shimmerTranslate = useRef(new Animated.Value(-180)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

  const canOpenOutsideWebView = (url) => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Only allow explicit deep-link style schemes to open outside.
    return (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('sms:') ||
      url.startsWith('whatsapp://') ||
      url.startsWith('intent://') ||
      url.startsWith('market://')
    );
  };

  const isShareCancelledError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('cancel') || msg.includes('dismiss');
  };

  const guessMimeTypeFromFilename = (filename) => {
    const lower = String(filename || '').toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.zip')) return 'application/zip';
    return 'image/png';
  };

  const getFilenameFromUrl = (url, fallback = 'download.png') => {
    try {
      const parsed = new URL(url);
      const fromQuery = parsed.searchParams.get('filename') || parsed.searchParams.get('file');
      if (fromQuery) {
        return fromQuery;
      }

      const pathname = parsed.pathname || '';
      const tail = pathname.split('/').filter(Boolean).pop();
      return tail || fallback;
    } catch {
      return fallback;
    }
  };

  const looksLikeDirectDownloadUrl = (url) => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsed = new URL(url);
      const pathname = (parsed.pathname || '').toLowerCase();
      const search = (parsed.search || '').toLowerCase();
      if (/\.(png|jpe?g|webp|gif|pdf|zip)$/.test(pathname)) {
        return true;
      }
      return search.includes('download=') || search.includes('filename=');
    } catch {
      return false;
    }
  };

  const saveHttpFileToDevice = async (url, preferredFilename) => {
    const filename = preferredFilename || getFilenameFromUrl(url, 'download.png');
    const fileUri = FileSystem.cacheDirectory + filename;
    const mimeType = guessMimeTypeFromFilename(filename);

    try {
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      const downloadedUri = downloadRes.uri;

      let permStatus = 'undetermined';
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(false);
        permStatus = perm?.status || 'undetermined';
      } catch (permError) {
        console.log('Media permission request failed', permError);
      }

      if (permStatus === 'granted') {
        try {
          const asset = await MediaLibrary.createAssetAsync(downloadedUri);
          const existingAlbum = await MediaLibrary.getAlbumAsync('WeVysya');
          if (existingAlbum) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
          } else {
            await MediaLibrary.createAlbumAsync('WeVysya', asset, false);
          }
          Alert.alert('Saved!', 'Flyer saved to your gallery.');
          return;
        } catch (saveError) {
          console.log('Gallery save failed, falling back to share sheet', saveError);
        }
      }

      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(downloadedUri, {
            dialogTitle: 'Save flyer',
            mimeType,
            UTI: 'public.image',
          });
        } catch (shareError) {
          if (!isShareCancelledError(shareError)) {
            throw shareError;
          }
        }
      } else {
        Alert.alert('Error', 'Could not save the flyer. Please grant Photos permission in device Settings and try again.');
      }
    } catch (downloadError) {
      console.log('Direct URL download failed', downloadError);
      Alert.alert('Download failed', 'Could not fetch the flyer. Please try again.');
    }
  };

  const openExternallyOrShare = async (url) => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      // If WhatsApp links are blocked in web context, route through native.
      const isWhatsAppUrl =
        url.includes('wa.me/') ||
        url.includes('api.whatsapp.com') ||
        url.startsWith('whatsapp://');

      if (isWhatsAppUrl) {
        try {
          const parsedUrl = new URL(url);
          const textParam = parsedUrl.searchParams.get('text');

          if (textParam) {
            await Share.share({ message: decodeURIComponent(textParam) });
            return true;
          }
        } catch (err) {
          // Ignore parsing errors and fall back to opening the URL directly.
        }
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch (err) {
      console.log('Failed to open external URL', err);
    }

    return false;
  };

  const handleWebViewMessage = async (event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (parseError) {
      // Ignore non-JSON messages posted by the website or third-party scripts.
      console.log('Ignoring non-JSON webview message');
      return;
    }

    try {
      if (data.type === 'SHARE') {
        const { base64, url, text, title } = data.payload;
        if (base64) {
          const base64Data = base64.split(',')[1];
          const mimeType = base64.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1] || 'png';
          const fileUri = FileSystem.cacheDirectory + 'shared_flyer.' + extension;
          
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (await Sharing.isAvailableAsync()) {
            try {
              await Sharing.shareAsync(fileUri, {
                dialogTitle: title || 'Share Flyer',
                mimeType: mimeType
              });
            } catch (shareError) {
              if (!isShareCancelledError(shareError)) {
                throw shareError;
              }
            }
          } else {
            Alert.alert('Error', 'Sharing is not available on this device');
          }
        } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          // URL share — download natively first, then open the native share sheet.
          // This is the correct path for the WhatsApp button in the WebView app.
          const shareFilename = 'flyer.png';
          const shareFileUri = FileSystem.cacheDirectory + shareFilename;
          try {
            const { uri: downloadedUri } = await FileSystem.downloadAsync(url, shareFileUri);
            if (await Sharing.isAvailableAsync()) {
              try {
                await Sharing.shareAsync(downloadedUri, {
                  dialogTitle: title || 'Share Flyer',
                  mimeType: 'image/png',
                  UTI: 'public.image',
                });
              } catch (shareError) {
                if (!isShareCancelledError(shareError)) {
                  throw shareError;
                }
              }
            } else {
              Alert.alert('Error', 'Sharing is not available on this device');
            }
          } catch (downloadError) {
            console.log('Share URL download failed', downloadError);
            // Fallback: share the raw URL as text
            await Share.share({ message: url, title: title || 'WeVysya Flyer' });
          }
        } else {
          await Share.share({
            message: text ? (url ? `${text} ${url}` : text) : url,
            title: title,
          });
        }
      } else if (data.type === 'DOWNLOAD') {
        const { url, filename: rawFilename, headers } = data.payload || {};
        const filename = rawFilename || 'download.png';

        // ── Step 1: Write file to cache ──────────────────────────────
        let fileUri = '';
        let mimeType = 'image/png';
        if (url && url.startsWith('data:')) {
          const base64Data = url.split(',')[1];
          const mimeMatch = url.match(/^data:([^;]+);/);
          mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const extension = mimeType.split('/')[1] || 'png';
          const actualFilename = filename.includes('.') ? filename : `${filename}.${extension}`;
          fileUri = FileSystem.cacheDirectory + actualFilename;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else if (url) {
          // URL passed directly from WebView — download natively off the UI thread.
          // Use legacy FileSystem.downloadAsync which is stable on this RN version.
          fileUri = FileSystem.cacheDirectory + filename;
          try {
            const downloadOptions = (headers && Object.keys(headers).length > 0) ? { headers } : {};
            const downloadRes = await FileSystem.downloadAsync(url, fileUri, downloadOptions);
            fileUri = downloadRes.uri;
          } catch (downloadError) {
            console.log('Direct download failed', downloadError);
            // Surface helpful message so user knows the issue.
            Alert.alert(
              'Download failed',
              'Could not fetch the flyer. Please use the Download button inside the flyer instead.'
            );
            return;
          }
        } else {
          Alert.alert('Error', 'Could not download the flyer.');
          return;
        }

        // ── Step 2: Request permission (correct API — no second arg) ─
        let permStatus = 'undetermined';
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(false);
          permStatus = perm?.status || 'undetermined';
        } catch (permError) {
          console.log('Media permission request failed', permError);
          // Permission API unavailable (Expo Go restriction) — fall through to share sheet
        }

        // ── Step 3: Save to gallery if permission granted ────────────
        if (permStatus === 'granted') {
          try {
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            const existingAlbum = await MediaLibrary.getAlbumAsync('WeVysya');
            if (existingAlbum) {
              await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
            } else {
              await MediaLibrary.createAlbumAsync('WeVysya', asset, false);
            }
            Alert.alert('Saved!', 'Flyer saved to your gallery.');
            return;
          } catch (saveError) {
            console.log('Gallery save failed, falling back to share sheet', saveError);
          }
        }

        // ── Step 4: Fallback — open native share/save sheet ──────────
        if (await Sharing.isAvailableAsync()) {
          try {
            await Sharing.shareAsync(fileUri, {
              dialogTitle: 'Save flyer',
              mimeType,
              UTI: 'public.image',
            });
          } catch (shareError) {
            if (!isShareCancelledError(shareError)) {
              throw shareError;
            }
          }
        } else {
          Alert.alert('Error', 'Could not save the flyer. Please grant Photos permission in device Settings and try again.');
        }
      }
    } catch (e) {
      console.log('Error handling webview message', e);
      Alert.alert('Error', 'Could not complete this action. Please try again.');
    }
  };

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

  // Send tokens to the WebView via postMessage.
  // Does NOT clear pendingTokensRef so that scheduled retries can resend.
  // The web app uses upsert (onConflict: user_id,token) so duplicate sends
  // are safe and idempotent.
  const flushPendingTokens = () => {
    const tokens = pendingTokensRef.current;
    if (!tokens || !webViewRef.current) return;
    const { expoPushToken, devicePushToken, devicePushTokenType } = tokens;

    if (expoPushToken) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'expoPushToken', token: expoPushToken })
      );
    }

    if (devicePushToken) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'devicePushToken', token: devicePushToken, tokenType: devicePushTokenType })
      );
      if (devicePushTokenType === 'fcm') {
        webViewRef.current.postMessage(
          JSON.stringify({ type: 'fcmToken', token: devicePushToken })
        );
      }
    }

    // NOTE: intentionally NOT setting pendingTokensRef.current = null here.
    // Tokens stay in the ref so retry flushes (scheduled below) can resend.
  };

  // Schedule retry flushes to handle two timing problems:
  //   1. React's message listener in the WebView may not be registered yet
  //      right after onLoadEnd — retries catch it once React mounts.
  //   2. The web app's savePushToken returns early when user === null (not
  //      logged in yet). Retries at 20s and 60s cover the time the user
  //      spends on the login screen before authenticating.
  // Safe to call multiple times — cancels any previously scheduled retries first.
  const scheduleTokenFlushRetries = () => {
    tokenFlushTimersRef.current.forEach(clearTimeout);
    tokenFlushTimersRef.current = [];

    const delays = [3000, 8000, 20000, 60000];
    const timers = delays.map((delay, idx) =>
      setTimeout(() => {
        flushPendingTokens();
        // After the last retry we can release the token from memory.
        if (idx === delays.length - 1) {
          pendingTokensRef.current = null;
          tokenFlushTimersRef.current = [];
        }
      }, delay)
    );
    tokenFlushTimersRef.current = timers;
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    registerForPushNotificationsAsync().then((tokens) => {
      if (!tokens) {
        return;
      }

      const {
        expoPushToken,
        devicePushToken,
        devicePushTokenType,
      } = tokens;

      if (expoPushToken) {
        console.log('Expo Push Token:', expoPushToken);
      }

      if (devicePushToken) {
        console.log('Device Push Token:', devicePushTokenType, devicePushToken);
      }

      // Store tokens — will be flushed once WebView is ready (onLoadEnd).
      // Tokens are kept in the ref (not cleared on flush) so retry attempts work.
      pendingTokensRef.current = { expoPushToken, devicePushToken, devicePushTokenType };

      // If WebView is already loaded, send immediately and schedule retries.
      // Retries cover: React mount timing gap + user login delay on web.
      if (webViewRef.current) {
        flushPendingTokens();
        scheduleTokenFlushRetries();
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
      // Cancel any scheduled token flush retries
      tokenFlushTimersRef.current.forEach(clearTimeout);
      tokenFlushTimersRef.current = [];

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
          setSupportMultipleWindows={false}
          originWhitelist={['https://*', 'http://*']}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          onShouldStartLoadWithRequest={(request) => {
            const reqUrl = request?.url;

            if (!reqUrl || reqUrl === 'about:blank') {
              return true;
            }

            // Block non-http content URLs from escaping the app.
            if (
              reqUrl.startsWith('blob:') ||
              reqUrl.startsWith('data:') ||
              reqUrl.startsWith('javascript:')
            ) {
              return false;
            }

            const isHttp = reqUrl.startsWith('http://') || reqUrl.startsWith('https://');
            if (isHttp) {
              // WhatsApp wa.me links must open in WhatsApp, not inside the WebView
              if (reqUrl.includes('wa.me') || reqUrl.includes('api.whatsapp.com')) {
                openExternallyOrShare(reqUrl);
                return false;
              }
              if (looksLikeDirectDownloadUrl(reqUrl)) {
                saveHttpFileToDevice(reqUrl, getFilenameFromUrl(reqUrl, 'download.png'));
                return false;
              }
              return true;
            }

            if (canOpenOutsideWebView(reqUrl)) {
              openExternallyOrShare(reqUrl);
            } else {
              console.log('Blocked unsupported navigation URL:', reqUrl);
            }
            return false;
          }}
          onNavigationStateChange={(navState) => {
            canGoBackRef.current = navState.canGoBack;
          }}
          onLoadEnd={() => {
            // Flush tokens immediately and schedule retries.
            // Retries are needed because:
            //   - React's message listener may not be registered yet at this exact moment
            //   - The user may not be logged in yet (savePushToken returns early if user===null)
            flushPendingTokens();
            scheduleTokenFlushRetries();
          }}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleWebViewMessage}
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

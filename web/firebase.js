// Firebase JS SDK from the gstatic CDN (no bundler). Version pinned; keep in sync with package.json.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { firebaseConfig, appCheckSiteKey } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);

export { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
export {
  doc, collection, getDoc, getDocFromServer, getDocs, setDoc, deleteDoc, writeBatch, updateDoc,
  serverTimestamp, Bytes, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

// One-time seed script — adds Top Canteen outlet + Chocolate ₹1 menu item
// Run: node scripts/seed.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, addDoc, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKWt-YqKG_8GYNFOk4hRx_w4ZfI5l_4QM",
  authDomain: "gen-lang-client-0573573934.firebaseapp.com",
  projectId: "gen-lang-client-0573573934",
  appId: "1:580185633750:web:88549cd5a4edc1f1576a77",
  storageBucket: "gen-lang-client-0573573934.firebasestorage.app",
  messagingSenderId: "580185633750",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app, "ai-studio-ada3af3d-a65a-4e94-a996-d4d19fd3f8d5");

const OUTLET_ID = "top-canteen";

async function seed() {
  // 1. Create the outlet
  await setDoc(doc(db, "outlets", OUTLET_ID), {
    name:        "Top Canteen",
    description: "KLU's main campus canteen — hot meals, snacks & more",
    imageUrl:    "https://picsum.photos/seed/topcanteen/600/400",
    isOpen:      true,
    merchantId:  "admin",
    blockName:   "Main Block",
    category:    "Canteen",
    upiId:       "7993547438@kotak811",
    timings:     "8:00 AM – 8:00 PM",
    rating:      4.5,
  });
  console.log("Outlet created: Top Canteen");

  // 2. Add Chocolate ₹1 pre-book item
  await setDoc(doc(db, `outlets/${OUTLET_ID}/menu`, "chocolate-prebook"), {
    outletId:    OUTLET_ID,
    name:        "Chocolate Pre-Book",
    description: "Pre-book your chocolate for just ₹1. Limited slots only.",
    price:       1,
    category:    "Snacks",
    isAvailable: true,
    prepTime:    "Instant",
    imageUrl:    "https://picsum.photos/seed/chocolate/400/300",
  });
  console.log("Menu item added: Chocolate Pre-Book @ Rs.1");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });

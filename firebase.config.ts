import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
// import { getFirestore,collection } from 'firebase/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import dotenv from 'dotenv'
dotenv.config()
// import { serviceAccount } from './chatbot-key.json'
// import { initializeApp } from "firebase/app";
// Initialize Firebase

// export const app = initializeApp({credential:cert(serviceAccount)});

initializeApp({
credential:cert(JSON.parse(process.env.PRIVATE_KEY))
// credential:cert('./firebase.json')
});
// const firebaseConfig = {
//   apiKey: process.env.FIREBASE_API_KEY,
//   authDomain: process.env.FIREBASE_AUTHDOMAIN,
//   projectId: process.env.FIREBASE_PROJECTID,
//   storageBucket: process.env.FIREBASE_STORAGEBUCKET,
//   messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
//   appId: process.env.FIREBASE_APPID,
// }
// let app:any
// let firestoreDb:any
// export const initializeFirebaseApp = () => {
//   try {
//     app = initializeApp(firebaseConfig)
//     firestoreDb=getFirestore()
//     return app
//   }catch(error) {
//     console.log('error', error)
//   }
// } 

// export const getFirebaseApp = () => app
// const app = initializeApp(firebaseConfig);
export const db = getFirestore()
// module.exports = {db}
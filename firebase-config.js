// CONFIGURAÇÃO DO FIREBASE — INOVA FIT
//
// 1) Crie/abra o projeto no Firebase.
// 2) Registre um aplicativo Web.
// 3) Copie o objeto firebaseConfig fornecido pelo Firebase.
// 4) Substitua os valores COLE_AQUI abaixo.
//
// IMPORTANTE:
// A configuração do app Web não é uma senha. A proteção dos dados deve ser feita
// com Authentication + regras do Firestore. Este projeto usa autenticação anônima
// em segundo plano, sem tela de login para os funcionários.

export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

export const firebaseConfigured =
  firebaseConfig.apiKey !== "COLE_AQUI" &&
  firebaseConfig.projectId !== "COLE_AQUI" &&
  firebaseConfig.appId !== "COLE_AQUI";

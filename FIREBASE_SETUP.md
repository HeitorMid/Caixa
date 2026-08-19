# Configurar Firebase — Inova Fit Caixa v5

Esta versão já está preparada para sincronizar os dados entre vários aparelhos.

## 1. Criar o projeto
1. Entre no Console do Firebase.
2. Crie um projeto, por exemplo `inova-fit-caixa`.
3. Dentro do projeto, registre um **Aplicativo Web**.

## 2. Copiar a configuração Web
O Firebase mostrará algo parecido com:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Abra `firebase-config.js` e substitua os valores `COLE_AQUI`.

## 3. Ativar Authentication sem tela de login
No Console Firebase:
1. Abra **Authentication**.
2. Vá em **Sign-in method / Método de login**.
3. Ative **Anonymous / Anônimo**.

O funcionário não verá tela de login. A autenticação ocorre em segundo plano.

## 4. Criar o Cloud Firestore
1. Abra **Firestore Database**.
2. Crie o banco.
3. Escolha uma região adequada.
4. Publique as regras que estão no arquivo `firestore.rules`.

As coleções usadas pelo sistema são:
- `inovaFitSystem`
- `inovaFitDaily`

## 5. Teste
Para testar a sincronização corretamente, use o site por HTTP/HTTPS.
O Firebase Hosting é uma opção simples.

Se tiver Firebase CLI instalado:

```bash
firebase login
firebase use --add
firebase deploy --only hosting,firestore:rules
```

## 6. Como funciona a migração
Na primeira conexão:
- se o Firestore estiver vazio, os dados existentes no navegador são enviados para a nuvem;
- se já houver dados no Firestore, os dados da nuvem passam a ser exibidos no aparelho.

## 7. Indicador no topo
- **Modo local**: Firebase ainda não configurado.
- **Conectando...**: estabelecendo conexão.
- **Sincronizando...**: enviando alterações.
- **Firebase conectado**: sincronização ativa.
- **Falha na sincronização**: conferir internet/configuração/regras.

## Segurança
Esta versão usa autenticação anônima para manter o uso simples e sem tela de login.
Para uso mais restrito em produção, o próximo reforço recomendado é Firebase App Check.

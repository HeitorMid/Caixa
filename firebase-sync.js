import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

const appBridge = window.InovaFitApp;

if(!appBridge){
  console.error("InovaFitApp não foi carregado antes do Firebase.");
}else if(!firebaseConfigured){
  appBridge.setCloudStatus("local","Modo local");
  console.info("Firebase ainda não configurado. O sistema continua usando localStorage.");
}else{
  startFirebase().catch(error=>{
    console.error("Erro ao iniciar Firebase:", error);
    appBridge.setCloudStatus("error","Firebase indisponível");
  });
}

async function startFirebase(){
  appBridge.setCloudStatus("connecting","Conectando...");

  // Firebase Web SDK modular via CDN oficial.
  const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js")
  ]);

  const {
    getAuth,
    signInAnonymously
  } = authMod;

  const {
    getFirestore,
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
  } = firestoreMod;

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  await signInAnonymously(auth);

  const db = getFirestore(firebaseApp);
  const configRef = doc(db,"inovaFitSystem","config");
  const currentRef = doc(db,"inovaFitSystem","currentCash");
  const dailyRef = collection(db,"inovaFitDaily");

  let remote = {
    employees:null,
    currentCash:null,
    historyByDate:{}
  };

  const hashes = {
    employees:null,
    currentCash:null,
    days:new Map()
  };

  let applyingRemote = false;
  let saveQueue = Promise.resolve();

  const hash = value => JSON.stringify(value ?? null);

  function buildRemoteState(){
    const history = Object.values(remote.historyByDate)
      .flat()
      .sort((a,b)=>String(a.openedAt||"").localeCompare(String(b.openedAt||"")));

    return {
      employees:remote.employees || appBridge.getState().employees,
      currentCash:remote.currentCash || null,
      history
    };
  }

  function applyFromCloud(){
    applyingRemote = true;
    appBridge.applyRemoteState(buildRemoteState());
    setTimeout(()=>{ applyingRemote=false; },0);
  }

  async function loadInitialCloud(){
    const [configSnap,currentSnap,dailySnap] = await Promise.all([
      getDoc(configRef),
      getDoc(currentRef),
      getDocs(dailyRef)
    ]);

    const hasCloudData =
      configSnap.exists() ||
      currentSnap.exists() ||
      !dailySnap.empty;

    if(configSnap.exists()){
      remote.employees = configSnap.data().employees || null;
      hashes.employees = hash(remote.employees);
    }
    if(currentSnap.exists()){
      remote.currentCash = currentSnap.data().cash || null;
      hashes.currentCash = hash(remote.currentCash);
    }

    dailySnap.forEach(dayDoc=>{
      const cashes = dayDoc.data().cashes || [];
      remote.historyByDate[dayDoc.id] = cashes;
      hashes.days.set(dayDoc.id, hash(cashes));
    });

    if(!hasCloudData){
      // Primeira conexão: aproveita os dados que já estavam salvos neste navegador.
      await saveStateNow(appBridge.getState());
    }else{
      applyFromCloud();
    }
  }

  function groupHistoryByDate(history){
    const grouped={};
    for(const cash of (history||[])){
      const date=cash.date || "sem-data";
      if(!grouped[date]) grouped[date]=[];
      grouped[date].push(cash);
    }
    return grouped;
  }

  async function saveStateNow(state){
    if(applyingRemote) return;

    appBridge.setCloudStatus("syncing","Sincronizando...");

    const employees = Array.isArray(state.employees) ? state.employees : [];
    const empHash = hash(employees);
    if(empHash !== hashes.employees){
      await setDoc(configRef,{
        employees,
        updatedAt:serverTimestamp()
      },{merge:true});
      hashes.employees=empHash;
    }

    const curHash = hash(state.currentCash);
    if(curHash !== hashes.currentCash){
      if(state.currentCash){
        await setDoc(currentRef,{
          cash:state.currentCash,
          updatedAt:serverTimestamp()
        });
      }else{
        await deleteDoc(currentRef);
      }
      hashes.currentCash=curHash;
    }

    const grouped=groupHistoryByDate(state.history);
    const localDates=new Set(Object.keys(grouped));

    for(const [date,cashes] of Object.entries(grouped)){
      const dayHash=hash(cashes);
      if(dayHash !== hashes.days.get(date)){
        await setDoc(doc(db,"inovaFitDaily",date),{
          cashes,
          updatedAt:serverTimestamp()
        });
        hashes.days.set(date,dayHash);
      }
    }

    // Remove dias que existiam na nuvem, mas foram totalmente removidos localmente.
    for(const date of [...hashes.days.keys()]){
      if(!localDates.has(date)){
        await deleteDoc(doc(db,"inovaFitDaily",date));
        hashes.days.delete(date);
      }
    }

    appBridge.setCloudStatus("online","Firebase conectado");
  }

  function queueSave(state){
    saveQueue = saveQueue
      .then(()=>saveStateNow(state))
      .catch(err=>{
        console.error("Erro ao salvar no Firestore:",err);
        appBridge.setCloudStatus("error","Falha na sincronização");
        throw err;
      });
    return saveQueue;
  }

  window.InovaFitCloud = {
    saveState: queueSave
  };

  await loadInitialCloud();

  // Sincronização em tempo real: qualquer aparelho que alterar os dados atualiza os demais.
  onSnapshot(configRef,snap=>{
    if(snap.exists()){
      remote.employees=snap.data().employees || [];
      hashes.employees=hash(remote.employees);
      applyFromCloud();
    }
  },err=>{
    console.error(err);
    appBridge.setCloudStatus("error","Erro no Firebase");
  });

  onSnapshot(currentRef,snap=>{
    remote.currentCash=snap.exists() ? (snap.data().cash || null) : null;
    hashes.currentCash=hash(remote.currentCash);
    applyFromCloud();
  },err=>{
    console.error(err);
    appBridge.setCloudStatus("error","Erro no Firebase");
  });

  onSnapshot(dailyRef,snapshot=>{
    const next={};
    snapshot.forEach(dayDoc=>{
      const cashes=dayDoc.data().cashes || [];
      next[dayDoc.id]=cashes;
      hashes.days.set(dayDoc.id,hash(cashes));
    });

    // limpa hashes de dias removidos remotamente
    for(const date of [...hashes.days.keys()]){
      if(!(date in next)) hashes.days.delete(date);
    }

    remote.historyByDate=next;
    applyFromCloud();
    appBridge.setCloudStatus("online","Firebase conectado");
  },err=>{
    console.error(err);
    appBridge.setCloudStatus("error","Erro no Firebase");
  });

  appBridge.setCloudStatus("online","Firebase conectado");
}

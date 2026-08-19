const MONEY = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});

const PLANS = [
  {id:"familia", name:"Família", price:75, perPerson:true},
  {id:"casal", name:"Casal", price:75, perPerson:true},
  {id:"mensal", name:"Mensal normal", price:85},
  {id:"3x", name:"3x por semana", price:65},
  {id:"trimestral", name:"Trimestral", price:240}
];
const FREEZER = [
  {id:"agua", name:"Água", price:3},
  {id:"monster", name:"Monster", price:13},
  {id:"powerade", name:"Powerade", price:9},
  {id:"redbull", name:"Red Bull", price:13},
  {id:"coca", name:"Coca", price:4}
];
const PAYMENTS = ["Dinheiro","Pix","Débito","Crédito"];
const SHIFTS = ["06:00 às 12:00","14:00 às 20:00","20:00 às 22:00"];

const state = {
  employees: load("inovafit_employees", ["Heitor","Elbe","Manu"]),
  currentCash: load("inovafit_current_cash", null),
  history: load("inovafit_history", [])
};

if (
  Array.isArray(state.employees) &&
  state.employees.length === 3 &&
  state.employees.includes("Itur") &&
  state.employees.includes("Elber") &&
  state.employees.includes("Manu")
) {
  state.employees = ["Heitor","Elbe","Manu"];
  localStorage.setItem("inovafit_employees", JSON.stringify(state.employees));
}

function load(key, fallback){
  try{
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  }catch{return fallback;}
}
function save(){
  localStorage.setItem("inovafit_employees", JSON.stringify(state.employees));
  localStorage.setItem("inovafit_current_cash", JSON.stringify(state.currentCash));
  localStorage.setItem("inovafit_history", JSON.stringify(state.history));
}
function money(v){ return MONEY.format(Number(v||0)); }
function isoDate(d=new Date()){
  const off=d.getTimezoneOffset();
  const local=new Date(d.getTime()-off*60000);
  return local.toISOString().slice(0,10);
}
function dateBR(s){
  if(!s) return "—";
  const [y,m,d]=s.slice(0,10).split("-");
  return `${d}/${m}/${y}`;
}
function timeBR(ts){
  return new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg; el.classList.remove("hidden");
  setTimeout(()=>el.classList.add("hidden"),2200);
}

function transactionTotals(transactions=[]){
  const totals={Dinheiro:0,Pix:0,"Débito":0,"Crédito":0};
  for(const t of transactions) totals[t.payment]=(totals[t.payment]||0)+t.total;
  return totals;
}

function render(){
  renderHeader();
  renderCash();
  renderHistory();
  renderDailySummary();
  renderEmployees();
}
function renderHeader(){
  const now=new Date();
  document.getElementById("todayLabel").textContent = dateBR(isoDate(now));
  document.getElementById("clockLabel").textContent = now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
setInterval(renderHeader,30000);

function renderCash(){
  const cash=state.currentCash;
  const root=document.getElementById("view-caixa");
  root.classList.toggle("cash-open", !!cash);

  document.getElementById("cashStatus").textContent = cash ? "CAIXA ABERTO" : "CAIXA FECHADO";
  document.getElementById("cashStatusSubtitle").textContent = cash ? "Expediente em andamento" : "Abra um expediente para começar";
  document.getElementById("statusEmployee").textContent = cash?.employee || "—";
  document.getElementById("statusShift").textContent = cash?.shift || "—";
  document.getElementById("statusOpenedAt").textContent = cash ? `${dateBR(cash.date)} ${timeBR(cash.openedAt)}` : "—";
  document.getElementById("openCashBtn").textContent = cash ? "TROCAR / REABRIR" : "ABRIR CAIXA";

  const byCategory={Mensalidade:0,Esquenta:0,Freezer:0};
  for(const t of (cash?.transactions || [])){
    byCategory[t.category]=(byCategory[t.category]||0)+Number(t.total||0);
  }
  const grand=byCategory.Mensalidade+byCategory.Esquenta+byCategory.Freezer;
  document.getElementById("sumMensalidade").textContent=money(byCategory.Mensalidade);
  document.getElementById("sumEsquenta").textContent=money(byCategory.Esquenta);
  document.getElementById("sumFreezer").textContent=money(byCategory.Freezer);
  document.getElementById("sumTotal").textContent=money(grand);

  const recent=document.getElementById("recentTransactions");
  if(!cash || !cash.transactions.length){
    recent.className="recent-list empty";
    recent.textContent="Nenhum lançamento ainda.";
  }else{
    recent.className="recent-list";
    recent.innerHTML=[...cash.transactions].reverse().slice(0,6).map(t=>`
      <div class="recent-item">
        <span>${timeBR(t.createdAt)}</span>
        <span>${t.category} — ${t.item}${t.quantity>1?` (${t.quantity})`:""}<br><small>${t.payment}</small></span>
        <strong>${money(t.total)}</strong>
        <button class="delete-sale-btn" title="Excluir venda" onclick="deleteTransaction('${cash.id}','${t.id}')">Excluir</button>
      </div>
    `).join("");
  }

  document.getElementById("finishBtn").disabled=!cash;
  document.querySelectorAll("[data-launch]").forEach(btn=>btn.disabled=!cash);
}

function openModal(html){
  document.getElementById("modal").innerHTML=html;
  document.getElementById("modalBackdrop").classList.remove("hidden");
}
function closeModal(){ document.getElementById("modalBackdrop").classList.add("hidden"); }
document.getElementById("modalBackdrop").addEventListener("click",e=>{ if(e.target.id==="modalBackdrop") closeModal(); });

function modalShell(title,body){
  return `<div class="modal-head"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
          <div class="modal-body">${body}</div>`;
}

function openCashModal(){
  const employeeOptions=state.employees.map(x=>`<option>${x}</option>`).join("");
  const shiftOptions=SHIFTS.map(x=>`<option>${x}</option>`).join("");
  openModal(modalShell("Abrir expediente",`
    <div class="field"><label>Funcionário</label><select id="cashEmployee">${employeeOptions}</select></div>
    <div class="field"><label>Turno</label><select id="cashShift">${shiftOptions}</select></div>
    <div class="field"><label>Data</label><input id="cashDate" type="date" value="${isoDate()}"></div>
    <div class="notice">Não há login individual. Basta selecionar quem está no turno.</div>
    <div class="modal-actions" style="margin-top:18px">
      <button class="secondary-btn" onclick="closeModal()">Cancelar</button>
      <button class="primary-btn" id="confirmOpenCash">ABRIR CAIXA</button>
    </div>`));
  document.getElementById("confirmOpenCash").onclick=()=>{
    const employee=document.getElementById("cashEmployee").value;
    const shift=document.getElementById("cashShift").value;
    const date=document.getElementById("cashDate").value;
    state.currentCash={
      id:crypto.randomUUID(),
      employee,shift,date,
      openedAt:new Date().toISOString(),
      transactions:[],
      status:"open"
    };
    save(); closeModal(); render(); toast("Caixa aberto com sucesso.");
  };
}

function paymentButtons(){
  return `<div class="payment-grid">${PAYMENTS.map(p=>`<button class="payment-btn" data-payment="${p}">${p}</button>`).join("")}</div>`;
}
function wirePaymentSelection(recalculate){
  document.querySelectorAll(".payment-btn").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".payment-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      recalculate?.();
    };
  });
}
function selectedPayment(){
  return document.querySelector(".payment-btn.active")?.dataset.payment || null;
}

function qtyControl(value=1){
  return `<div class="qty-wrap">
    <button type="button" id="qtyMinus">−</button>
    <input id="qtyInput" type="number" min="1" value="${value}">
    <button type="button" id="qtyPlus">+</button>
  </div>`;
}
function wireQty(recalculate){
  const input=document.getElementById("qtyInput");
  document.getElementById("qtyMinus").onclick=()=>{input.value=Math.max(1,Number(input.value||1)-1);recalculate();};
  document.getElementById("qtyPlus").onclick=()=>{input.value=Number(input.value||1)+1;recalculate();};
  input.oninput=()=>{if(Number(input.value)<1)input.value=1;recalculate();};
}

function addTransaction(data){
  if(!state.currentCash) return toast("Abra um caixa primeiro.");
  state.currentCash.transactions.push({
    id:crypto.randomUUID(),
    createdAt:new Date().toISOString(),
    ...data
  });
  save(); closeModal(); render(); toast("Lançamento adicionado.");
}

function openMembership(){
  let selected=PLANS[0].id;
  openModal(modalShell("Lançar mensalidade",`
    <div class="field"><label>Selecione o plano</label>
      <div class="choice-grid">
        ${PLANS.map((p,i)=>`<button class="choice-btn ${i===0?"active":""}" data-choice="${p.id}"><strong>${p.name}</strong><br><small>${money(p.price)}${p.perPerson?" por pessoa":""}</small></button>`).join("")}
      </div>
    </div>
    <div class="field"><label>Quantidade</label>${qtyControl(1)}</div>
    <div class="field"><label>Forma de pagamento</label>${paymentButtons()}</div>
    <div class="modal-total"><span>Total</span><strong id="modalTotal">R$ 0,00</strong></div>
    <div class="modal-actions">
      <button class="secondary-btn" onclick="closeModal()">Cancelar</button>
      <button class="primary-btn" id="confirmTransaction">CONFIRMAR</button>
    </div>`));
  const recalc=()=>{
    const plan=PLANS.find(x=>x.id===selected);
    const qty=Number(document.getElementById("qtyInput").value||1);
    document.getElementById("modalTotal").textContent=money(plan.price*qty);
  };
  document.querySelectorAll(".choice-btn").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".choice-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selected=btn.dataset.choice; recalc();
  });
  wireQty(recalc); wirePaymentSelection(recalc); recalc();
  document.getElementById("confirmTransaction").onclick=()=>{
    const payment=selectedPayment(); if(!payment)return toast("Selecione a forma de pagamento.");
    const plan=PLANS.find(x=>x.id===selected);
    const qty=Number(document.getElementById("qtyInput").value||1);
    addTransaction({category:"Mensalidade",item:plan.name,quantity:qty,unitPrice:plan.price,payment,total:plan.price*qty});
  };
}

function openDaily(){
  openModal(modalShell("Lançar esquenta",`
    <div class="price-box"><small>Valor único</small><strong>${money(10)}</strong></div>
    <div class="field"><label>Quantidade</label>${qtyControl(1)}</div>
    <div class="field"><label>Forma de pagamento</label>${paymentButtons()}</div>
    <div class="modal-total"><span>Total</span><strong id="modalTotal">R$ 10,00</strong></div>
    <div class="modal-actions">
      <button class="secondary-btn" onclick="closeModal()">Cancelar</button>
      <button class="primary-btn" id="confirmTransaction">CONFIRMAR</button>
    </div>`));
  const recalc=()=>document.getElementById("modalTotal").textContent=money(10*Number(document.getElementById("qtyInput").value||1));
  wireQty(recalc); wirePaymentSelection(recalc);
  document.getElementById("confirmTransaction").onclick=()=>{
    const payment=selectedPayment(); if(!payment)return toast("Selecione a forma de pagamento.");
    const qty=Number(document.getElementById("qtyInput").value||1);
    addTransaction({category:"Esquenta",item:"Diária",quantity:qty,unitPrice:10,payment,total:10*qty});
  };
}

function openFreezer(){
  let selected=FREEZER[0].id;
  openModal(modalShell("Lançar freezer",`
    <div class="field"><label>Selecione o produto</label>
      <div class="choice-grid">
        ${FREEZER.map((p,i)=>`<button class="choice-btn ${i===0?"active":""}" data-choice="${p.id}"><strong>${p.name}</strong><br><small>${money(p.price)}</small></button>`).join("")}
      </div>
    </div>
    <div class="field"><label>Quantidade</label>${qtyControl(1)}</div>
    <div class="field"><label>Forma de pagamento</label>${paymentButtons()}</div>
    <div class="notice">No débito ou crédito, é acrescentado R$ 1,00 por unidade do produto.</div>
    <div class="modal-total"><span>Total</span><strong id="modalTotal">R$ 0,00</strong></div>
    <div class="modal-actions">
      <button class="secondary-btn" onclick="closeModal()">Cancelar</button>
      <button class="primary-btn" id="confirmTransaction">CONFIRMAR</button>
    </div>`));
  const calc=()=>{
    const product=FREEZER.find(x=>x.id===selected);
    const qty=Number(document.getElementById("qtyInput").value||1);
    const payment=selectedPayment();
    const surcharge=(payment==="Débito"||payment==="Crédito")?1:0;
    return {product,qty,unit:product.price+surcharge,total:(product.price+surcharge)*qty,surcharge};
  };
  const recalc=()=>document.getElementById("modalTotal").textContent=money(calc().total);
  document.querySelectorAll(".choice-btn").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".choice-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");selected=btn.dataset.choice;recalc();
  });
  wireQty(recalc); wirePaymentSelection(recalc); recalc();
  document.getElementById("confirmTransaction").onclick=()=>{
    const payment=selectedPayment(); if(!payment)return toast("Selecione a forma de pagamento.");
    const c=calc();
    addTransaction({category:"Freezer",item:c.product.name,quantity:c.qty,unitPrice:c.unit,payment,total:c.total,cardSurcharge:c.surcharge});
  };
}

function finishCash(){
  if(!state.currentCash)return;
  const cash=state.currentCash;
  const totals=transactionTotals(cash.transactions);
  const grand=Object.values(totals).reduce((a,b)=>a+b,0);
  const byCategory={Mensalidade:0,Esquenta:0,Freezer:0};
  cash.transactions.forEach(t=>byCategory[t.category]=(byCategory[t.category]||0)+t.total);

  openModal(modalShell("Finalizar expediente",`
    <div class="settings-list static">
      <div><span>Mensalidades</span><strong>${money(byCategory.Mensalidade)}</strong></div>
      <div><span>Esquentas</span><strong>${money(byCategory.Esquenta)}</strong></div>
      <div><span>Freezer</span><strong>${money(byCategory.Freezer)}</strong></div>
    </div>
    <h4>Por forma de pagamento</h4>
    <div class="settings-list static">
      ${PAYMENTS.map(p=>`<div><span>${p}</span><strong>${money(totals[p])}</strong></div>`).join("")}
    </div>
    <div class="modal-total"><span>TOTAL GERAL</span><strong>${money(grand)}</strong></div>
    <div class="modal-actions">
      <button class="secondary-btn" onclick="closeModal()">Voltar</button>
      <button class="primary-btn" id="confirmFinish">FINALIZAR</button>
    </div>`));
  document.getElementById("confirmFinish").onclick=()=>{
    const closed={...state.currentCash,status:"closed",closedAt:new Date().toISOString(),lastEditedAt:null};
    state.history.push(closed);
    state.currentCash=null;
    save();closeModal();render();toast("Expediente finalizado.");
  };
}

function renderHistory(){
  const wrap=document.getElementById("historyList");
  const date=document.getElementById("historyDateFilter").value;
  const list=[...state.history].reverse().filter(x=>!date||x.date===date);
  if(!list.length){wrap.innerHTML=`<div class="notice">Nenhum caixa encontrado para este período.</div>`;return;}
  wrap.innerHTML=list.map(c=>{
    const totals=transactionTotals(c.transactions);
    const total=Object.values(totals).reduce((a,b)=>a+b,0);
    return `<div class="history-card">
      <div><small>Data</small><strong>${dateBR(c.date)}</strong></div>
      <div><small>Funcionário</small><strong>${c.employee}</strong></div>
      <div><small>Turno</small><strong>${c.shift}</strong></div>
      <div><small>Total</small><strong>${money(total)}</strong>${c.lastEditedAt?`<small>Editado ${dateBR(isoDate(new Date(c.lastEditedAt)))} ${timeBR(c.lastEditedAt)}</small>`:""}</div>
      <div class="history-actions">
        <button onclick="viewCash('${c.id}')">Ver</button>
        <button onclick="reopenCash('${c.id}')">Reabrir</button>
      </div>
    </div>`;
  }).join("");
}

function viewCash(id){
  const c=state.history.find(x=>x.id===id); if(!c)return;
  const totals=transactionTotals(c.transactions);
  openModal(modalShell("Detalhes do expediente",`
    <div class="settings-list static">
      <div><span>Funcionário</span><strong>${c.employee}</strong></div>
      <div><span>Turno</span><strong>${c.shift}</strong></div>
      <div><span>Data</span><strong>${dateBR(c.date)}</strong></div>
    </div>
    <h4>Lançamentos</h4>
    <div class="settings-list static">
      ${c.transactions.length?c.transactions.map(t=>`<div class="modal-sale-row"><span>${timeBR(t.createdAt)} • ${t.category} • ${t.item} × ${t.quantity}<br><small>${t.payment}</small></span><span class="modal-sale-actions"><strong>${money(t.total)}</strong><button class="delete-sale-btn" onclick="deleteTransaction('${c.id}','${t.id}',true)">Excluir</button></span></div>`).join(""):"<div>Nenhum lançamento.</div>"}
    </div>
    <div class="modal-total"><span>Total</span><strong>${money(Object.values(totals).reduce((a,b)=>a+b,0))}</strong></div>
    <div class="modal-actions"><button class="secondary-btn" onclick="closeModal()">Fechar</button></div>`));
}


function deleteTransaction(cashId, transactionId, reopenDetails=false){
  let cash=null;
  let isCurrent=false;

  if(state.currentCash?.id===cashId){
    cash=state.currentCash;
    isCurrent=true;
  }else{
    cash=state.history.find(c=>c.id===cashId);
  }

  if(!cash) return toast("Não foi possível localizar esse expediente.");

  const transaction=cash.transactions.find(t=>t.id===transactionId);
  if(!transaction) return toast("Venda não encontrada.");

  const description=`${transaction.category} — ${transaction.item} — ${money(transaction.total)}`;
  if(!confirm(`Deseja realmente excluir esta venda?\n\n${description}\n\nEssa ação atualizará os totais automaticamente.`)) return;

  cash.transactions=cash.transactions.filter(t=>t.id!==transactionId);
  cash.lastEditedAt=new Date().toISOString();

  if(isCurrent){
    state.currentCash=cash;
  }

  save();
  render();
  toast("Venda excluída e totais atualizados.");

  if(reopenDetails && !isCurrent){
    setTimeout(()=>viewCash(cashId), 50);
  }else{
    closeModal();
  }
}

function reopenCash(id){
  if(state.currentCash && !confirm("Há um caixa aberto. Deseja substituir o caixa atual?"))return;
  const idx=state.history.findIndex(x=>x.id===id); if(idx<0)return;
  const c=state.history.splice(idx,1)[0];
  state.currentCash={...c,status:"open",lastEditedAt:new Date().toISOString()};
  save();render();switchView("caixa");toast("Caixa reaberto.");
}

function renderDailySummary(){
  const date=document.getElementById("summaryDateFilter").value||isoDate();
  const list=state.history.filter(c=>c.date===date).map(c=>({...c}));
  if(state.currentCash?.date===date) list.push({...state.currentCash});

  const allSales=[];
  for(const cash of list){
    for(const t of (cash.transactions||[])){
      allSales.push({
        ...t,
        cashId:cash.id,
        employee:cash.employee,
        shift:cash.shift,
        cashStatus:cash.status
      });
    }
  }

  const totals=transactionTotals(allSales);
  document.getElementById("dailyDinheiro").textContent=money(totals.Dinheiro);
  document.getElementById("dailyPix").textContent=money(totals.Pix);
  document.getElementById("dailyDebito").textContent=money(totals["Débito"]);
  document.getElementById("dailyCredito").textContent=money(totals["Crédito"]);
  document.getElementById("dailyTotal").textContent=money(Object.values(totals).reduce((a,b)=>a+b,0));

  // Resumo agregado por categoria + item
  const grouped={};
  for(const sale of allSales){
    const key=`${sale.category}|||${sale.item}`;
    if(!grouped[key]){
      grouped[key]={
        category:sale.category,
        item:sale.item,
        quantity:0,
        total:0
      };
    }
    grouped[key].quantity += Number(sale.quantity||1);
    grouped[key].total += Number(sale.total||0);
  }

  const itemSummary=document.getElementById("dailyItemSummary");
  const groupedRows=Object.values(grouped).sort((a,b)=>{
    if(a.category!==b.category) return a.category.localeCompare(b.category,"pt-BR");
    return a.item.localeCompare(b.item,"pt-BR");
  });

  if(!groupedRows.length){
    itemSummary.innerHTML=`<div class="notice">Nenhuma venda registrada nesta data.</div>`;
  }else{
    itemSummary.innerHTML=`
      <table class="sales-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Item / Plano</th>
            <th>Quantidade</th>
            <th>Total vendido</th>
          </tr>
        </thead>
        <tbody>
          ${groupedRows.map(row=>`
            <tr>
              <td><span class="category-badge">${row.category}</span></td>
              <td><strong>${row.item}</strong></td>
              <td>${row.quantity}</td>
              <td><strong>${money(row.total)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  // Lista detalhada de todas as vendas do dia
  const detail=document.getElementById("dailySalesDetail");
  const ordered=[...allSales].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));

  if(!ordered.length){
    detail.innerHTML=`<div class="notice">Nenhum lançamento registrado nesta data.</div>`;
  }else{
    detail.innerHTML=`
      <table class="sales-table detailed">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Funcionário</th>
            <th>Turno</th>
            <th>Categoria</th>
            <th>Item / Plano</th>
            <th>Qtd.</th>
            <th>Pagamento</th>
            <th>Unitário</th>
            <th>Total</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${ordered.map(sale=>`
            <tr>
              <td>${timeBR(sale.createdAt)}</td>
              <td><strong>${sale.employee}</strong></td>
              <td>${sale.shift}</td>
              <td><span class="category-badge">${sale.category}</span></td>
              <td>${sale.item}</td>
              <td>${sale.quantity||1}</td>
              <td>${sale.payment}</td>
              <td>${money(sale.unitPrice)}</td>
              <td><strong>${money(sale.total)}</strong></td>
              <td><button class="delete-sale-btn" onclick="deleteTransaction('${sale.cashId}','${sale.id}')">Excluir</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }
}

function renderEmployees(){
  const wrap=document.getElementById("employeeList");
  wrap.innerHTML=state.employees.map((name,i)=>`<div><span>${name}</span><button onclick="removeEmployee(${i})">Remover</button></div>`).join("");
}
function removeEmployee(i){
  if(state.employees.length<=1)return toast("Mantenha ao menos um funcionário.");
  state.employees.splice(i,1);save();render();
}

function switchView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  const titles={
    caixa:["Caixa","Painel principal"],
    historico:["Histórico","Caixas e lançamentos"],
    resumo:["Resumo diário","Total do dia"],
    funcionarios:["Funcionários","Gerenciar nomes"],
    config:["Configurações","Planos e produtos"]
  };
  document.getElementById("pageTitle").textContent=titles[name][0];
  document.getElementById("pageSubtitle").textContent=titles[name][1];
  document.getElementById("sidebar").classList.remove("open");
  render();
}

document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>switchView(btn.dataset.view));
document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("openCashBtn").onclick=openCashModal;
document.getElementById("finishBtn").onclick=finishCash;
document.querySelectorAll("[data-launch]").forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.launch==="mensalidade")openMembership();
  if(btn.dataset.launch==="esquenta")openDaily();
  if(btn.dataset.launch==="freezer")openFreezer();
});
document.getElementById("seeAllBtn").onclick=()=>switchView("historico");
document.getElementById("historyDateFilter").onchange=renderHistory;
document.getElementById("summaryDateFilter").value=isoDate();
document.getElementById("summaryDateFilter").onchange=renderDailySummary;
document.getElementById("addEmployeeBtn").onclick=()=>{
  const input=document.getElementById("newEmployeeName");
  const name=input.value.trim();
  if(!name)return;
  if(state.employees.some(x=>x.toLowerCase()===name.toLowerCase()))return toast("Esse funcionário já existe.");
  state.employees.push(name);input.value="";save();render();toast("Funcionário adicionado.");
};

window.closeModal=closeModal;
window.viewCash=viewCash;
window.reopenCash=reopenCash;
window.deleteTransaction=deleteTransaction;
window.removeEmployee=removeEmployee;

render();

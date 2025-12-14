const stateMap = ["Created", "Rented", "Issued", "ReturnedOk", "ReturnedDamaged", "Completed"];

const $ = (id) => document.getElementById(id);
const logEl = $("logs");
const setLog = (msg) => {
  const now = new Date().toLocaleTimeString();
  logEl.textContent = `[${now}] ${msg}\n` + (logEl.textContent || "");
};

let provider, signer, contract;
let abiCache;
let isConnected = false; // frontend session state only
let connectedAccount = undefined;
let lastContractAddress = ""; // Remember loaded contract address

function updateConnectButton() {
  const btn = $("connect-btn");
  const lbl = $("account-auth-label");
  if (isConnected) {
    btn.textContent = "Disconnect";
    btn.classList.remove("btn--connect");
    btn.classList.add("btn--disconnect");
    btn.disabled = false;
    if (lbl) lbl.style.display = "none";
  } else {
    btn.textContent = "Connect";
    btn.classList.remove("btn--disconnect");
    btn.classList.add("btn--connect");
    btn.disabled = false;
    if (lbl) lbl.style.display = "none";
  }
}

function resetUi() {
  provider = undefined;
  signer = undefined;
  contract = undefined;
  isConnected = false;
  connectedAccount = undefined;
  $("network").textContent = "-";
  $("account").textContent = "Neprisijungta";
  $("role").textContent = "-";
  $("state").textContent = "-";
  $("contract-balance").textContent = "-";
  $("owner").textContent = "-";
  $("inspector").textContent = "-";
  $("renter").textContent = "-";
  $("status").textContent = "";
  $("connect-msg").textContent = "";
  $("action-msg").textContent = "";
  updateConnectButton();
  updateActionButtons("-");
  setLog("Atsijungta.");
}

async function getAbi() {
  if (!abiCache) {
    const res = await fetch('abi.json');
    if (!res.ok) throw new Error('Nepavyko užkrauti abi.json');
    abiCache = await res.json();
  }
  return abiCache;
}

async function connect() {
  if (!window.ethereum) {
    $("connect-msg").innerHTML = '<span class="error">MetaMask nerasta.</span>';
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  // Request accounts
  const accounts = await provider.send("eth_requestAccounts", []);
  connectedAccount = accounts && accounts[0] ? accounts[0] : undefined;
  if (!connectedAccount) {
    $("connect-msg").innerHTML = '<span class="error">Nepavyko gauti paskyros.</span>';
    return;
  }
  // Check chain (Sepolia only)
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);
  $("network").textContent = `${net.name} (chainId ${chainId})`;
  if (chainId !== 11155111) {
    $("connect-msg").innerHTML = '<span class="error">Prašome perjungti į Sepolia.</span>';
    // Do NOT create signer or contract; block session
    connectedAccount = undefined;
    return;
  }
  // Create signer only on Sepolia
  signer = await provider.getSigner();
  $("account").textContent = connectedAccount;
  isConnected = true;
  updateConnectButton();
  $("connect-msg").innerHTML = '<span class="success">Prisijungta (Sepolia).</span>';
  // Bind MetaMask events to force session reset
  try {
    window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
    window.ethereum.removeListener?.("chainChanged", onChainChanged);
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    window.ethereum.on?.("chainChanged", onChainChanged);
  } catch {}
}

function detectRole(owner, inspector, renter) {
  if (!connectedAccount) return "-";
  const a = connectedAccount.toLowerCase();
  if (owner && owner.toLowerCase() === a) return "Owner";
  if (inspector && inspector.toLowerCase() === a) return "Inspector";
  if (renter && renter.toLowerCase() === a) return "Renter";
  return "-";
}

async function refresh() {
  if (!contract) return;
  const [st, bal, o, i, r] = await Promise.all([
    contract.state(),
    provider.getBalance(contract.target),
    contract.owner(),
    contract.inspector(),
    contract.renter(),
  ]);
  $("state").textContent = stateMap[Number(st)] || st;
  $("contract-balance").textContent = `${ethers.formatEther(bal)} ETH`;
  $("owner").textContent = o;
  $("inspector").textContent = i;
  $("renter").textContent = r === ethers.ZeroAddress ? '-' : r;
  const role = detectRole(o, i, r);
  $("role").textContent = role;
  updateActionButtons(role);
}

function updateActionButtons(role) {
  // rent: any role can call
  $("rent-btn").disabled = false;
  $("rent-btn").classList.remove("btn--disabled");
  
  // markIssued: Owner only
  const canMark = role === "Owner";
  $("mark-btn").disabled = !canMark;
  $("mark-btn").classList.toggle("btn--disabled", !canMark);
  
  // confirmReturn (ok/bad): Inspector only
  const canConfirm = role === "Inspector";
  $("confirm-ok").disabled = !canConfirm;
  $("confirm-ok").classList.toggle("btn--disabled", !canConfirm);
  $("confirm-bad").disabled = !canConfirm;
  $("confirm-bad").classList.toggle("btn--disabled", !canConfirm);
  
  // complete (ok/bad): Owner only
  const canComplete = role === "Owner";
  $("complete-ok").disabled = !canComplete;
  $("complete-ok").classList.toggle("btn--disabled", !canComplete);
  $("complete-bad").disabled = !canComplete;
  $("complete-bad").classList.toggle("btn--disabled", !canComplete);
}

async function loadContract() {
  try {
    const addr = $("contract-address").value.trim();
    if (!ethers.isAddress(addr)) throw new Error("Neteisingas adresas");
    if (!isConnected) throw new Error("Pirma prisijunk (Connect)");
    const abi = await getAbi();
    contract = new ethers.Contract(addr, abi, signer);
    await refresh();
    lastContractAddress = addr; // Remember for auto-reload
    setLog(`Kontraktas užkrautas: ${addr}`);
    $("status").innerHTML = '<span class="success">Kontraktas paruoštas.</span>';
  } catch (err) {
    $("status").innerHTML = `<span class="error">${err.message}</span>`;
  }
}

async function tx(fn, label) {
  if (!contract) throw new Error("Pirma užkrauk kontraktą.");
  $("action-msg").innerHTML = `Vykdoma: ${label} ...`;
  const tx = await fn();
  setLog(`${label} → tx: ${tx.hash}`);
  const receipt = await tx.wait();
  setLog(`${label} patvirtinta, gasUsed=${receipt.gasUsed}`);
  await refresh();
  $("action-msg").innerHTML = `<span class="success">${label} pavyko</span>`;
}

async function onAccountsChanged() {
  // Auto-reconnect on account change
  resetUi();
  $("connect-msg").innerHTML = '<span class="muted">Paskyra pasikeitė – bandoma prisijungti...</span>';
  try {
    await connect();
    // Auto-reload contract if one was loaded before
    if (lastContractAddress && ethers.isAddress(lastContractAddress)) {
      $("contract-address").value = lastContractAddress;
      await loadContract();
    }
  } catch (e) {
    $("connect-msg").innerHTML = `<span class="error">Nepavyko automatiškai prisijungti: ${e.message}</span>`;
  }
}

async function onChainChanged() {
  // Attempt auto-reconnect only if now on Sepolia; otherwise prompt to switch
  resetUi();
  $("connect-msg").innerHTML = '<span class="muted">Tinklas pasikeitė – tikrinama...</span>';
  try {
    const chainHex = await window.ethereum.request?.({ method: "eth_chainId" });
    if (chainHex && chainHex.toLowerCase() === "0xaa36a7") {
      await connect();
      // Auto-reload contract if one was loaded before
      if (lastContractAddress && ethers.isAddress(lastContractAddress)) {
        $("contract-address").value = lastContractAddress;
        await loadContract();
      }
    } else {
      $("connect-msg").innerHTML = '<span class="error">Prašome perjungti į Sepolia ir paspausti Connect.</span>';
    }
  } catch (e) {
    $("connect-msg").innerHTML = `<span class="error">Klaida tikrinant tinklą: ${e.message}</span>`;
  }
}

function bindActions() {
  $("connect-btn").onclick = async () => {
    if (isConnected) {
      resetUi();
    } else {
      await connect();
    }
  };
  // Remove header login/logout control as requested
  const lbl = $("account-auth-label");
  if (lbl) {
    lbl.onclick = null;
    lbl.style.display = "none";
  }
  $("load-btn").onclick = loadContract;

  $("rent-btn").onclick = async () => {
    try {
      const val = $("rent-value").value || "0";
      const value = ethers.parseEther(val);
      await tx(() => contract.rent({ value }), `rent() ${val} ETH`);
    } catch (err) {
      $("action-msg").innerHTML = `<span class="error">${err.message}</span>`;
    }
  };

  $("mark-btn").onclick = async () => {
    try { await tx(() => contract.markIssued(), "markIssued()"); }
    catch (err) { $("action-msg").innerHTML = `<span class="error">${err.message}</span>`; }
  };

  $("confirm-ok").onclick = async () => {
    try { await tx(() => contract.confirmReturn(false), "confirmReturn(false)"); }
    catch (err) { $("action-msg").innerHTML = `<span class="error">${err.message}</span>`; }
  };

  $("confirm-bad").onclick = async () => {
    try { await tx(() => contract.confirmReturn(true), "confirmReturn(true)"); }
    catch (err) { $("action-msg").innerHTML = `<span class="error">${err.message}</span>`; }
  };

  $("complete-ok").onclick = async () => {
    try { await tx(() => contract.complete(), "complete()"); }
    catch (err) { $("action-msg").innerHTML = `<span class="error">${err.message}</span>`; }
  };

  $("complete-bad").onclick = async () => {
    try { await tx(() => contract.completeDamaged(), "completeDamaged()"); }
    catch (err) { $("action-msg").innerHTML = `<span class="error">${err.message}</span>`; }
  };
}

bindActions();

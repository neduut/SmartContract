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

function updateConnectButton() {
  const btn = $("connect-btn");
  if (isConnected) {
    btn.textContent = "Disconnect";
    btn.classList.remove("btn--connect");
    btn.classList.add("btn--disconnect");
    btn.disabled = false;
    $("account-auth-label").textContent = "Log out";
  } else {
    btn.textContent = "Connect";
    btn.classList.remove("btn--disconnect");
    btn.classList.add("btn--connect");
    btn.disabled = false;
    $("account-auth-label").textContent = "Log in";
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
  $("profile").textContent = "Neprisijungta";
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
  $("profile").textContent = connectedAccount;
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
  $("role").textContent = detectRole(o, i, r);
}

async function loadContract() {
  try {
    const addr = $("contract-address").value.trim();
    if (!ethers.isAddress(addr)) throw new Error("Neteisingas adresas");
    if (!isConnected) throw new Error("Pirma prisijunk (Connect)");
    const abi = await getAbi();
    contract = new ethers.Contract(addr, abi, signer);
    await refresh();
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

function onAccountsChanged() {
  // Force frontend logout on account change
  resetUi();
  $("connect-msg").innerHTML = '<span class="muted">Paskyra pasikeitė – sesija baigta.</span>';
}

function onChainChanged() {
  // Force frontend logout on network change
  resetUi();
  $("connect-msg").innerHTML = '<span class="muted">Tinklas pasikeitė – sesija baigta.</span>';
}

function bindActions() {
  $("connect-btn").onclick = async () => {
    if (isConnected) {
      resetUi();
    } else {
      await connect();
    }
  };
  $("account-auth-label").onclick = async () => {
    // Make the header label act as Connect/Logout control
    if (isConnected) {
      resetUi();
    } else {
      await connect();
    }
  };
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

const stateMap = ["Created", "Rented", "Issued", "ReturnedOk", "ReturnedDamaged", "Completed"];
const eventNames = {
  Rented: "rent()",
  Issued: "markIssued()",
  Returned: "confirmReturn()",
  Completed: "complete()"
};
const ETHERSCAN_API_KEY = ""; // Įrašyk savo Sepolia Etherscan API raktą
const ETHERSCAN_API = "https://api-sepolia.etherscan.io/api";

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
  updateActionButtons("-", null, null);
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
  const stateNum = Number(st);
  $("state").textContent = stateMap[stateNum] || st;
  $("contract-balance").textContent = `${ethers.formatEther(bal)} ETH`;
  $("owner").textContent = o;
  $("inspector").textContent = i;
  $("renter").textContent = r === ethers.ZeroAddress ? '-' : r;
  const role = detectRole(o, i, r);
  $("role").textContent = role;
  updateActionButtons(role, stateNum, r);
}

function updateActionButtons(role, stateValue, renterAddr) {
  const zeroAddr = "0x0000000000000000000000000000000000000000";
  const renterUnset = !renterAddr || renterAddr === ethers.ZeroAddress || renterAddr === zeroAddr;
  const canRent = stateValue === 0 && renterUnset;
  $("rent-btn").disabled = !canRent;
  $("rent-btn").classList.toggle("btn--disabled", !canRent);
  
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

function formatFunctionName(fn) {
  if (!fn) return "-";
  const clean = fn.trim();
  if (!clean) return "-";
  if (clean.toLowerCase() === "" || clean === "()") return "-";
  if (clean.startsWith("function ")) return clean.replace("function ", "");
  return clean;
}

function shortHash(hash) {
  if (!hash || hash.length < 10) return hash || "-";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr || "-";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAge(tsSeconds) {
  if (!tsSeconds) return "-";
  const now = Date.now();
  const diffMs = now - Number(tsSeconds) * 1000;
  if (diffMs < 0) return new Date(Number(tsSeconds) * 1000).toLocaleString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "< 1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function formatEth(valueWei) {
  try {
    return `${ethers.formatEther(valueWei)} ETH`;
  } catch {
    return valueWei === undefined || valueWei === null ? "-" : String(valueWei);
  }
}

function renderTxs(entries) {
  const tbody = document.getElementById("txs-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!entries.length) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = "Nerasta įrašų";
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
    return;
  }

  entries.forEach((tx) => {
    const tr = document.createElement("tr");
    const hashCell = document.createElement("td");
    const methodCell = document.createElement("td");
    const blockCell = document.createElement("td");
    const ageCell = document.createElement("td");
    const fromCell = document.createElement("td");
    const toCell = document.createElement("td");
    const amountCell = document.createElement("td");
    const feeCell = document.createElement("td");

    const a = document.createElement("a");
    a.href = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = shortHash(tx.hash);
    hashCell.appendChild(a);

    methodCell.textContent = tx.method || "-";

    const blockLink = document.createElement("a");
    blockLink.href = `https://sepolia.etherscan.io/block/${tx.block}`;
    blockLink.target = "_blank";
    blockLink.rel = "noopener";
    blockLink.textContent = tx.block || "-";
    blockCell.appendChild(blockLink);

    ageCell.textContent = tx.age || "-";

    const fromLink = document.createElement("a");
    fromLink.href = `https://sepolia.etherscan.io/address/${tx.from}`;
    fromLink.target = "_blank";
    fromLink.rel = "noopener";
    fromLink.textContent = shortAddr(tx.from);
    fromCell.appendChild(fromLink);

    const toLink = document.createElement("a");
    toLink.href = `https://sepolia.etherscan.io/address/${tx.to}`;
    toLink.target = "_blank";
    toLink.rel = "noopener";
    toLink.textContent = shortAddr(tx.to);
    toCell.appendChild(toLink);

    amountCell.textContent = tx.amount || "-";
    feeCell.textContent = tx.fee || "-";

    amountCell.classList.add("txs-num");
    feeCell.classList.add("txs-num");

    tr.appendChild(hashCell);
    tr.appendChild(methodCell);
    tr.appendChild(blockCell);
    tr.appendChild(ageCell);
    tr.appendChild(fromCell);
    tr.appendChild(toCell);
    tr.appendChild(amountCell);
    tr.appendChild(feeCell);
    tbody.appendChild(tr);
  });
}

async function fetchTxs() {
  if (!contract) return;
  const address = contract.target;
  const apiKey = (ETHERSCAN_API_KEY || "").trim();
  const url = `${ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${apiKey ? `&apikey=${apiKey}` : ""}`;

  // Show loading row
  renderTxs([{ hash: "", step: "Kraunama...", status: "", gas: "" }]);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      const entries = data.result.slice(0, 20).map((tx) => {
        const fn = formatFunctionName(tx.functionName);
        const gasUsed = tx.gasUsed ? BigInt(tx.gasUsed) : 0n;
        const gasPrice = tx.gasPrice ? BigInt(tx.gasPrice) : 0n;
        const feeWei = gasUsed * gasPrice;
        return {
          hash: tx.hash,
          method: fn === "-" ? (tx.input === "0x" ? "receive" : "fallback") : fn,
          block: tx.blockNumber,
          age: formatAge(tx.timeStamp),
          from: tx.from,
          to: tx.to,
          amount: tx.value ? `${ethers.formatEther(tx.value)} ETH` : "-",
          fee: feeWei > 0n ? `${ethers.formatEther(feeWei)} ETH` : "-",
        };
      });
      renderTxs(entries);
      $("action-msg").innerHTML = ""; // nerodome pranešimo, net jei be API rakto
      return;
    }

    // If Etherscan responded but with error (rate limit / missing key), try on-chain fallback
    const reason = data.message || "Nepavyko gauti duomenų";
    const fallback = await fetchTxsOnChainFallback();
    renderTxs(fallback);
    $("action-msg").innerHTML = ""; // slėpti NOTOK pranešimą
  } catch (err) {
    const fallback = await fetchTxsOnChainFallback();
    renderTxs(fallback);
    $("action-msg").innerHTML = ""; // slėpti NOTOK pranešimą
  }
}

async function fetchTxsOnChainFallback() {
  if (!contract) return [];
  const provider = contract.runner?.provider;
  const eventTypes = ["Rented", "Issued", "Returned", "Completed"];
  const txs = [];

  for (const eventName of eventTypes) {
    try {
      const filter = contract.filters[eventName]?.();
      if (!filter) continue;
      const logs = await contract.queryFilter(filter, 0, "latest");
      logs.forEach((log) => {
        txs.push({
          blockNumber: log.blockNumber,
          hash: log.transactionHash,
          method: eventNames[eventName] || eventName,
        });
      });
    } catch (err) {
      console.warn(`Fallback: nepavyko gauti ${eventName} logų`, err);
    }
  }

  txs.sort((a, b) => b.blockNumber - a.blockNumber);

  if (provider && txs.length) {
    const uniqueBlocks = [...new Set(txs.map((t) => t.blockNumber))];
    const uniqueHashes = [...new Set(txs.map((t) => t.hash))];
    const blockMap = new Map();
    const receiptMap = new Map();
    const txMap = new Map();
    await Promise.all(
      uniqueBlocks.map(async (bn) => {
        try {
          const block = await provider.getBlock(bn);
          blockMap.set(bn, block?.timestamp ? new Date(block.timestamp * 1000) : null);
        } catch (err) {
          console.warn("Fallback: nepavyko gauti bloko laiko", bn, err);
        }
      })
    );
    await Promise.all(
      uniqueHashes.map(async (h) => {
        try {
          const r = await provider.getTransactionReceipt(h);
          if (r) receiptMap.set(h, r);
        } catch (err) {
          console.warn("Fallback: nepavyko gauti tx kvito", h, err);
        }
        try {
          const t = await provider.getTransaction(h);
          if (t) txMap.set(h, t);
        } catch (err) {
          console.warn("Fallback: nepavyko gauti tx duomenų", h, err);
        }
      })
    );
    txs.forEach((tx) => {
      const ts = blockMap.get(tx.blockNumber);
      tx.age = formatAge(ts ? Math.floor(ts.getTime() / 1000) : undefined);
      tx.block = tx.blockNumber;

      const rcpt = receiptMap.get(tx.hash);
      const txd = txMap.get(tx.hash);
      if (txd?.from) tx.from = txd.from;
      if (txd?.to) tx.to = txd.to;
      if (txd?.value !== undefined) tx.amount = formatEth(txd.value);
      if (rcpt?.gasUsed && txd?.gasPrice) {
        const feeWei = rcpt.gasUsed * txd.gasPrice;
        tx.fee = formatEth(feeWei);
      }
    });
  }

  return txs.slice(0, 20);
}

async function loadContract() {
  try {
    const addr = $("contract-address").value.trim();
    if (!ethers.isAddress(addr)) throw new Error("Neteisingas adresas");
    if (!isConnected) throw new Error("Pirma prisijunk (Connect)");
    const abi = await getAbi();
    contract = new ethers.Contract(addr, abi, signer);
    await refresh();
    await fetchTxs();
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
  await fetchTxs();
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

  const fetchBtn = $("fetch-txs-btn");
  if (fetchBtn) {
    fetchBtn.onclick = async () => {
      $("action-msg").innerHTML = "Gaunami transakcijų duomenys...";
      await fetchTxs();
      $("action-msg").innerHTML = "";
    };
  }
}

bindActions();

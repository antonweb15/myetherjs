import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useEffect, useState } from 'react';

import './App.css';

// Refer to the README doc for more information about using API
// keys in client-side code. You should never do this in production
// level code.
const settings = {
  apiKey: process.env.REACT_APP_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};


// In this week's lessons we used ethers.js. Here we are using the
// Alchemy SDK is an umbrella library with several different packages.
//
// You can read more about the packages here:
//   https://docs.alchemy.com/reference/alchemy-sdk-api-surface-overview#api-surface
const alchemy = new Alchemy(settings);

// A small helper that visually truncates long text with ellipsis
// but copies the full value to clipboard on Cmd/Ctrl+C.
function EllipsisCopy({ text, title }) {
  const full = String(text ?? '');
  function handleCopy(e) {
    try {
      if (e?.clipboardData) {
        e.clipboardData.setData('text/plain', full);
        e.preventDefault();
      }
    } catch (_) {
      // noop: fallback to default copy
    }
  }
  return (
    <span
      title={title || full}
      onCopy={handleCopy}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        verticalAlign: 'bottom',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {full}
    </span>
  );
}

function TransactionView() {
  const params = new URLSearchParams(window.location.search);
  const txHash = params.get('tx');
  const bnParam = params.get('bn');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tx, setTx] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        let block = null;
        let found = null;
        if (bnParam != null) {
          const num = Number(bnParam);
          const key = Number.isNaN(num) ? bnParam : num;
          block = await alchemy.core.getBlockWithTransactions(key);
          found = block?.transactions?.find((t) => (t && typeof t === 'object' ? t.hash : t) === txHash);
        }
        // If not found in the provided block (or no bn), fall back to fetching the tx directly
        if (!found && txHash) {
          const t = await alchemy.core.getTransaction(txHash);
          if (t && t.blockHash) {
            // If we already fetched a block and it's a different one, refetch by the actual tx blockHash
            if (!block || (block && block.hash !== t.blockHash)) {
              block = await alchemy.core.getBlockWithTransactions(t.blockHash);
            }
            found = block?.transactions?.find((x) => (x && typeof x === 'object' ? x.hash : x) === txHash) || t;
          } else {
            // Pending or unknown block — at least show whatever we have
            found = t;
          }
        }
        if (!found) {
          setError('Transaction not found');
          setTx(null);
          return;
        }
        setTx(found);
      } catch (e) {
        setError(e?.message || 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    }
    if (txHash) {
      load();
    } else {
      setError('No tx hash provided');
      setLoading(false);
    }
  }, [txHash, bnParam]);

  return (
    <div>
      <h2>Transaction</h2>
      {error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : loading ? (
        <p>Loading...</p>
      ) : tx ? (
        <div style={{ textAlign: 'left' }}>
          <ul>
            {Object.entries(tx)
              .filter(([, value]) => typeof value !== 'function')
              .map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong>{' '}
                {((key === 'input' || key === 'data') && typeof value === 'string') ? (
                  <EllipsisCopy text={value} title={value} />
                ) : (
                  typeof value === 'object' ? JSON.stringify(value) : String(value)
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}

function Header() {
  const base = `${window.location.origin}${window.location.pathname}`;
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderBottom: '1px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 1
    }}>
      <div style={{ fontWeight: 600 }}>
        <a href={base} style={{ color: '#0b5ed7', textDecoration: 'none' }}>Block Explorer</a>
      </div>
      <nav>
        <a href={`${base}?page=user`} style={{ color: '#0b5ed7', textDecoration: 'underline' }}>User</a>
      </nav>
    </header>
  );
}

function UserPage() {
  const [account, setAccount] = useState(null);
  const [accLoading, setAccLoading] = useState(false);
  const [accError, setAccError] = useState(null);
  const [accBalance, setAccBalance] = useState(null);

  const [addrInput, setAddrInput] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState(null);
  const [addrBalance, setAddrBalance] = useState(null);

  async function connectMetaMask() {
    try {
      if (!window.ethereum) {
        setAccError('MetaMask not found in the browser');
        return;
      }
      setAccError(null);
      setAccLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const first = accounts && accounts[0];
      setAccount(first || null);
    } catch (e) {
      setAccError(e?.message || 'Failed to connect to MetaMask');
    } finally {
      setAccLoading(false);
    }
  }

  // Fetch ETH balance using the currently selected chain in MetaMask when available.
  // Falls back to Alchemy (mainnet config) if MetaMask is not present.
  async function getEthBalance(address) {
    if (window.ethereum) {
      const hexWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      // hexWei like '0x1234...'
      const hasBigInt = (typeof window !== 'undefined') && (typeof window.BigInt === 'function');
      const wei = hasBigInt ? window.BigInt(hexWei) : parseInt(hexWei, 16);
      return Utils.formatEther(wei);
    }
    const wei = await alchemy.core.getBalance(address, 'latest');
    return Utils.formatEther(wei);
  }

  useEffect(() => {
    async function loadBalance() {
      if (!account) { setAccBalance(null); return; }
      try {
        setAccError(null);
        setAccLoading(true);
        const eth = await getEthBalance(account);
        setAccBalance(eth);
      } catch (e) {
        setAccError(e?.message || 'Failed to fetch balance');
      } finally {
        setAccLoading(false);
      }
    }
    loadBalance();
  }, [account]);

  async function fetchAddrBalance() {
    const addr = addrInput.trim();
    if (!addr) { setAddrError('Enter an address'); setAddrBalance(null); return; }
    try {
      setAddrError(null);
      setAddrLoading(true);
      const eth = await getEthBalance(addr);
      setAddrBalance(eth);
    } catch (e) {
      setAddrError(e?.message || 'Не удалось получить баланс по адресу');
      setAddrBalance(null);
    } finally {
      setAddrLoading(false);
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2>User</h2>
      <section style={{ marginBottom: 24 }}>
        <h3>Connected account balance (MetaMask)</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={connectMetaMask} disabled={accLoading}>
            {accLoading ? 'Connecting…' : (account ? 'Reconnect' : 'Connect MetaMask')}
          </button>
          {account && <span style={{ fontFamily: 'monospace' }}>{account}</span>}
        </div>
        {accError && <p style={{ color: 'red' }}>{accError}</p>}
        <div style={{ marginTop: 8 }}>
          {account ? (
            accLoading ? 'Loading balance…' : (
              accBalance != null ? <strong>{accBalance} ETH</strong> : 'No data')
          ) : 'Account is not connected'}
        </div>
      </section>

      <section>
        <h3>Get balance by address</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="0x... address"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <button type="button" onClick={fetchAddrBalance} disabled={addrLoading}>
            {addrLoading ? 'Request…' : 'Get balance'}
          </button>
        </div>
        {addrError && <p style={{ color: 'red' }}>{addrError}</p>}
        {addrBalance != null && (
          <div style={{ marginTop: 8 }}>
            Balance: <strong>{addrBalance} ETH</strong>
          </div>
        )}
      </section>
    </div>
  );
}

function App() {
  const [blockNumber, setBlockNumber] = useState();

  useEffect(() => {
    async function getBlockNumber() {
      setBlockNumber(await alchemy.core.getBlockNumber());
    }
    getBlockNumber();
  }, []);

  // more block info (lazy-loaded on click)
  const [blockInfo, setBlockInfo] = useState();
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState(null);

  async function toggleBlockInfo() {
    const nextOpen = !isBlockOpen;
    setIsBlockOpen(nextOpen);
    if (nextOpen && !blockInfo && blockNumber != null) {
      setInfoLoading(true);
      setInfoError(null);
      try {
        const info = await alchemy.core.getBlock(blockNumber);
        setBlockInfo(info);
      } catch (e) {
        setInfoError(e?.message || 'Failed to load block info');
      } finally {
        setInfoLoading(false);
      }
    }
  }

  function openTxInNewTab(tx) {
    const hash = typeof tx === 'string' ? tx : tx?.hash;
    if (!hash) return;
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = `${base}?tx=${encodeURIComponent(hash)}${blockNumber != null ? `&bn=${encodeURIComponent(blockNumber)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Determine current page from URL
  const urlParams = new URLSearchParams(window.location.search);
  const txParam = urlParams.get('tx');
  const pageParam = urlParams.get('page');

  return (
    <div className="App">
      <Header />
      {txParam ? (
        <TransactionView />
      ) : pageParam === 'user' ? (
        <UserPage />
      ) : (
        <div style={{ padding: '16px' }}>
          <p>Block Number: <br/> <span>{blockNumber}</span></p>
          <hr />
          <h3>
            <button
              type="button"
              onClick={toggleBlockInfo}
              disabled={infoLoading}
              aria-busy={infoLoading}
              style={{ background: 'none', border: 'none', padding: 0, color: '#0b5ed7', textDecoration: 'underline', cursor: infoLoading ? 'not-allowed' : 'pointer' }}
            >
              {`Block Info${infoLoading ? ' (loading...)' : ''}`}
            </button>
          </h3>
          {isBlockOpen && (
            infoError ? (
              <p style={{ color: 'red' }}>{infoError}</p>
            ) : infoLoading ? (
              <p>Loading...</p>
            ) : blockInfo ? (
              <ul>
                {Object.entries(blockInfo)
                  .sort(([a], [b]) => (a === 'transactions') - (b === 'transactions'))
                  .map(([key, value]) => (
                    key === 'transactions' && Array.isArray(value) ? (
                      <li key={key}>
                        <strong>{key}:</strong>
                        <ul>
                          {value.map((tx, idx) => {
                            const hash = typeof tx === 'string' ? tx : tx?.hash;
                            const label = hash || (typeof tx === 'object' ? JSON.stringify(tx) : String(tx));
                            const href = `?tx=${encodeURIComponent(hash || '')}${blockNumber != null ? `&bn=${encodeURIComponent(blockNumber)}` : ''}`;
                            return (
                              <li key={idx}>
                                {hash ? (
                                  <a
                                    href={href}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openTxInNewTab(tx);
                                    }}
                                    style={{ color: '#0b5ed7', textDecoration: 'underline', cursor: 'pointer' }}
                                  >
                                    {label}
                                  </a>
                                ) : (
                                  label
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ) : (
                      <li key={key}>
                        <strong>{key}:</strong>{' '}
                        {key === 'timestamp' ? (
                          (() => {
                            const isNum = typeof value === 'number' && Number.isFinite(value);
                            const d = isNum ? new Date(value * 1000) : new Date(value);
                            const isValid = !isNaN(d.getTime());
                            const full = isValid ? d.toISOString() : String(value);
                            const shown = isValid ? d.toLocaleString() + ' (' + d.toISOString() + ')' : String(value);
                            return <EllipsisCopy text={shown} title={full} />;
                          })()
                        ) : (
                          typeof value === 'object' ? JSON.stringify(value) : value.toString()
                        )}
                      </li>
                    )
                  ))}
              </ul>
            ) : (
              <p>No data</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default App;

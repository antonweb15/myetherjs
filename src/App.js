import { Alchemy, Network } from 'alchemy-sdk';
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

  return <div className="App">
      <p>Block Number: <br/> <span>{blockNumber}</span></p>
      <hr></hr>
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
                              {value.map((tx, idx) => (
                                  <li key={idx}>
                                      {typeof tx === 'string' ? tx : JSON.stringify(tx)}
                                  </li>
                              ))}
                          </ul>
                      </li>
                  ) : (
                      <li key={key}>
                          <strong>{key}:</strong>{" "}
                          {typeof value === "object"
                              ? JSON.stringify(value)
                              : value.toString()}
                      </li>
                  )
              ))}
          </ul>
        ) : (
          <p>No data</p>
        )
      )}
  </div>;
}

export default App;
